import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.trim() === '') {
  throw new Error('DATABASE_URL is required for the observability smoke test.');
}

const port = '4174';
const origin = `http://127.0.0.1:${port}`;
let stdout = '';
let stderr = '';

const server = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'test',
    PORT: port,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stdout.on('data', (chunk) => {
  stdout += chunk.toString();
});

server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await globalThis.fetch(`${origin}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await sleep(100);
  }

  throw new Error(`Observability server did not become healthy. stderr=${stderr}`);
}

try {
  await waitForHealth();

  const requestId = 'req-aks-007';
  const correlationId = 'corr-aks-007';
  const health = await globalThis.fetch(`${origin}/health`, {
    headers: {
      'x-request-id': requestId,
      'x-correlation-id': correlationId,
    },
  });
  const healthBody = await health.json();

  assert.equal(health.status, 200);
  assert.equal(health.headers.get('x-request-id'), requestId);
  assert.equal(health.headers.get('x-correlation-id'), correlationId);
  assert.equal(healthBody.status, 'ok');
  assert.equal(healthBody.checks.database.status, 'ok');
  assert.equal(typeof healthBody.checks.database.latencyMs, 'number');

  const failure = await globalThis.fetch(`${origin}/__test/server-error`, {
    headers: {
      'x-request-id': 'req-error-aks-007',
      'x-correlation-id': 'corr-error-aks-007',
    },
  });
  const failureBody = await failure.json();

  assert.equal(failure.status, 500);
  assert.equal(failureBody.status, 'error');
  assert.equal(failureBody.requestId, 'req-error-aks-007');

  await sleep(100);

  const jsonLogs = stdout
    .trim()
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line));

  const requestLog = jsonLogs.find(
    (entry) =>
      entry.event === 'http.request.completed' &&
      entry.requestId === requestId &&
      entry.correlationId === correlationId,
  );
  assert.ok(requestLog);
  assert.equal(requestLog.statusCode, 200);
  assert.equal(requestLog.path, '/health');

  const errorLog = jsonLogs.find(
    (entry) =>
      entry.event === 'http.request.error' &&
      entry.requestId === 'req-error-aks-007',
  );
  assert.ok(errorLog);
  assert.equal(errorLog.error.name, 'Error');
  assert.match(errorLog.error.message, /\[REDACTED\]/);

  assert.equal(stdout.includes(databaseUrl), false);
  assert.equal(stdout.includes('postgresql://'), false);

  process.stdout.write(
    'Observability smoke passed: structured logs, IDs, DB health, and error redaction verified.\n',
  );
} finally {
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    sleep(2_000),
  ]);
}
