import { randomUUID } from 'node:crypto';
import process from 'node:process';

import { parseWebServerEnv } from '@akiksystems/config/env';
import {
  createLogger,
  runWithObservabilityContext,
} from '@akiksystems/config/observability';
import { createPostgresHealthCheck } from '@akiksystems/db/health';
import express from 'express';

const BUILD_PATH = './build/server/index.js';
const env = parseWebServerEnv(process.env);
const DEVELOPMENT = env.NODE_ENV === 'development';
const PORT = env.PORT;
const logger = createLogger({
  service: 'web',
  redactValues: [env.DATABASE_URL],
});
const databaseHealth =
  env.DATABASE_URL === undefined
    ? undefined
    : createPostgresHealthCheck(env.DATABASE_URL, {
        onPoolError(error) {
          logger.error('database.pool.error', error);
        },
      });

const app = express();

app.disable('x-powered-by');

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function normalizeRequestId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : undefined;
}

app.use((request, response, next) => {
  const requestId = normalizeRequestId(request.get('x-request-id')) ?? randomUUID();
  const correlationId =
    normalizeRequestId(request.get('x-correlation-id')) ?? requestId;
  const startedAt = performance.now();

  response.setHeader('x-request-id', requestId);
  response.setHeader('x-correlation-id', correlationId);

  response.once('finish', () => {
    logger.info('http.request.completed', {
      requestId,
      correlationId,
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    });
  });

  runWithObservabilityContext({ requestId, correlationId }, next);
});

app.get('/health', async (_request, response) => {
  if (databaseHealth === undefined) {
    logger.warn('health.database.unconfigured');
    response.status(503).json({
      status: 'degraded',
      service: 'web',
      checks: {
        database: {
          status: 'unconfigured',
        },
      },
    });
    return;
  }

  const database = await databaseHealth.check();

  if (!database.ok) {
    logger.error('health.database.failed', database.error, {
      latencyMs: database.latencyMs,
    });
    response.status(503).json({
      status: 'degraded',
      service: 'web',
      checks: {
        database: {
          status: 'error',
          latencyMs: database.latencyMs,
        },
      },
    });
    return;
  }

  response.status(200).json({
    status: 'ok',
    service: 'web',
    checks: {
      database: {
        status: 'ok',
        latencyMs: database.latencyMs,
      },
    },
  });
});

if (env.NODE_ENV === 'test') {
  app.get('/__test/server-error', () => {
    throw new Error(
      `Synthetic server failure using ${env.DATABASE_URL ?? 'no-database-configured'}`,
    );
  });
}

if (DEVELOPMENT) {
  const viteDevServer = await import('vite').then((vite) =>
    vite.createServer({
      server: { middlewareMode: true },
    }),
  );

  app.use(viteDevServer.middlewares);
  app.use(async (request, response, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule('./server/app.ts');
      return await source.app(request, response, next);
    } catch (error) {
      if (error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }

      next(error);
    }
  });
} else {
  app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }));
  app.use(express.static('build/client', { maxAge: '1h' }));
  app.use(await import(BUILD_PATH).then((module) => module.app));
}

/** @type {import('express').ErrorRequestHandler} */
const serverErrorHandler = (error, request, response, next) => {
  const requestId = response.getHeader('x-request-id');
  const correlationId = response.getHeader('x-correlation-id');

  logger.error('http.request.error', error, {
    requestId,
    correlationId,
    method: request.method,
    path: request.path,
    statusCode: 500,
  });

  if (response.headersSent) {
    next(error);
  } else {
    response.status(500).json({
      status: 'error',
      requestId,
    });
  }
};

app.use(serverErrorHandler);

const server = app.listen(PORT, () => {
  logger.info('web.started', {
    port: PORT,
    environment: env.NODE_ENV,
  });
});

let stopping = false;

/**
 * @param {NodeJS.Signals} signal
 */
async function shutdown(signal) {
  if (stopping) {
    return;
  }

  stopping = true;
  logger.info('web.shutdown.started', { signal });

  server.close(async (error) => {
    if (error !== undefined) {
      logger.error('web.shutdown.error', error, { signal });
    }

    await databaseHealth?.close();
    logger.info('web.shutdown.completed', { signal });
    process.exit(error === undefined ? 0 : 1);
  });
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});
