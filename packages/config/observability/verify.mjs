import { strict as assert } from 'node:assert';

import { createLogger, runWithObservabilityContext } from './index.mjs';

const databaseUrl = 'postgresql://aks_user:super-secret-password@db.internal:5432/akiksystems';
const emitted = [];
const logger = createLogger({
  service: 'observability-verification',
  redactValues: [databaseUrl],
  write: (line) => emitted.push(line),
});

runWithObservabilityContext(
  {
    requestId: 'req-aks-007',
    correlationId: 'corr-aks-007',
  },
  () => {
    logger.info('verification.info', {
      databaseUrl,
      nested: {
        password: 'another-secret-password',
        authorization: 'Bearer secret-access-token',
      },
    });

    logger.error(
      'verification.error',
      new Error(`Database connection failed for ${databaseUrl}`),
      {
        token: 'secret-token-field',
      },
    );
  },
);

assert.equal(emitted.length, 2);

const parsed = emitted.map((line) => JSON.parse(line));
assert.equal(parsed[0].service, 'observability-verification');
assert.equal(parsed[0].requestId, 'req-aks-007');
assert.equal(parsed[0].correlationId, 'corr-aks-007');
assert.equal(parsed[0].databaseUrl, '[REDACTED]');
assert.equal(parsed[0].nested.password, '[REDACTED]');
assert.equal(parsed[0].nested.authorization, '[REDACTED]');

const output = emitted.join('\n');
assert.equal(output.includes('super-secret-password'), false);
assert.equal(output.includes('another-secret-password'), false);
assert.equal(output.includes('secret-access-token'), false);
assert.equal(output.includes(databaseUrl), false);

process.stdout.write('Structured observability redaction verification passed.\n');
