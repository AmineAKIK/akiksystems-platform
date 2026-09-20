export interface ObservabilityContext {
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly [key: string]: unknown;
}

export interface StructuredLogger {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, error: unknown, fields?: Record<string, unknown>): void;
}

export interface CreateLoggerOptions {
  service: string;
  redactValues?: readonly (string | undefined)[];
  write?: (line: string) => void;
}

export function createLogger(options: CreateLoggerOptions): StructuredLogger;
export function currentObservabilityContext(): Readonly<ObservabilityContext>;
export function runWithObservabilityContext<T>(
  context: ObservabilityContext,
  callback: () => T,
): T;
