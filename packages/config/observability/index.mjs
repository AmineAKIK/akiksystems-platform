import { AsyncLocalStorage } from 'node:async_hooks';

const contextStorage = new AsyncLocalStorage();
const sensitiveKeyPattern =
  /(?:authorization|cookie|credential|database.?url|password|secret|token|api.?key|connection.?string)/i;
const postgresCredentialPattern = /\b(postgres(?:ql)?):\/\/[^@\s]+@/gi;
const bearerPattern = /\bBearer\s+[^\s,;]+/gi;

/**
 * @param {unknown} value
 * @param {readonly string[]} redactValues
 * @returns {unknown}
 */
function sanitizeValue(value, redactValues) {
  if (typeof value === 'string') {
    let sanitized = value;

    for (const redactValue of redactValues) {
      if (redactValue.length > 0) {
        sanitized = sanitized.split(redactValue).join('[REDACTED]');
      }
    }

    return sanitized
      .replace(postgresCredentialPattern, '$1://[REDACTED]@')
      .replace(bearerPattern, 'Bearer [REDACTED]');
  }

  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'undefined'
  ) {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeValue(value.message, redactValues),
      stack: sanitizeValue(value.stack, redactValues),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, redactValues));
  }

  if (typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const output = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      output[key] = sensitiveKeyPattern.test(key)
        ? '[REDACTED]'
        : sanitizeValue(nestedValue, redactValues);
    }

    return output;
  }

  return String(value);
}

/**
 * @param {Record<string, unknown>} context
 * @param {() => unknown} callback
 * @returns {unknown}
 */
export function runWithObservabilityContext(context, callback) {
  return contextStorage.run(Object.freeze({ ...context }), callback);
}

/**
 * @returns {Readonly<Record<string, unknown>>}
 */
export function currentObservabilityContext() {
  return contextStorage.getStore() ?? Object.freeze({});
}

/**
 * @param {{
 *   service: string;
 *   redactValues?: readonly (string | undefined)[];
 *   write?: (line: string) => void;
 * }} options
 */
export function createLogger({ service, redactValues = [], write = defaultWrite }) {
  const activeRedactions = redactValues.filter(
    /** @returns {value is string} */ (value) => typeof value === 'string' && value.length > 0,
  );

  /**
   * @param {'info' | 'warn' | 'error'} level
   * @param {string} event
   * @param {Record<string, unknown>} fields
   */
  function emit(level, event, fields = {}) {
    const payload = sanitizeValue(
      {
        timestamp: new Date().toISOString(),
        level,
        service,
        event,
        ...currentObservabilityContext(),
        ...fields,
      },
      activeRedactions,
    );

    write(JSON.stringify(payload));
  }

  return Object.freeze({
    info(event, fields = {}) {
      emit('info', event, fields);
    },
    warn(event, fields = {}) {
      emit('warn', event, fields);
    },
    error(event, error, fields = {}) {
      emit('error', event, {
        ...fields,
        error,
      });
    },
  });
}

/**
 * @param {string} line
 */
function defaultWrite(line) {
  process.stdout.write(`${line}\n`);
}
