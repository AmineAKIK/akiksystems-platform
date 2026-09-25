import { randomUUID } from 'node:crypto';
import process from 'node:process';

import { parseAuthEnv, parseWebServerEnv } from '@akiksystems/config/env';
import {
  createLogger,
  runWithObservabilityContext,
} from '@akiksystems/config/observability';
import { createPostgresHealthCheck } from '@akiksystems/db/health';
import express from 'express';

const BUILD_PATH = './build/server/index.js';
const env = parseWebServerEnv(process.env);
const authEnv = parseAuthEnv(process.env);
const DEVELOPMENT = env.NODE_ENV === 'development';
const STAGING = process.env.RAILWAY_ENVIRONMENT_NAME === 'staging';
const ADMIN_ORIGIN = new URL(authEnv.BETTER_AUTH_URL).origin;
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
// Railway is the single public reverse-proxy hop in front of this process.
// Keep the outer Express app aligned with the React Router sub-app so request
// protocol/host semantics consistently describe the original public request.
app.set('trust proxy', 1);

/**
 * @param {string} path
 * @returns {boolean}
 */
function isAdminRequestPath(path) {
  return (
    path === '/admin' ||
    path.startsWith('/admin/') ||
    path.startsWith('/admin.')
  );
}

const noIndexDirective = 'noindex, nofollow, noarchive, nosnippet';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
].join('; ');

app.use((request, response, next) => {
  const writeHead = response.writeHead;
  response.writeHead = function writeHeadWithRobots(statusCode, ...args) {
    if (statusCode === 404 && !response.hasHeader('X-Robots-Tag')) {
      response.setHeader('X-Robots-Tag', noIndexDirective);
    }

    return Reflect.apply(writeHead, this, [statusCode, ...args]);
  };

  response.setHeader('Content-Security-Policy', contentSecurityPolicy);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  );
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('X-Frame-Options', 'DENY');

  if (env.NODE_ENV === 'production') {
    response.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }

  if (STAGING) {
    response.setHeader('X-Robots-Tag', noIndexDirective);
  }

  if (isAdminRequestPath(request.path)) {
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('X-Robots-Tag', noIndexDirective);
  }

  next();
});

app.use((request, response, next) => {
  if (
    !isAdminRequestPath(request.path) ||
    ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
  ) {
    next();
    return;
  }

  const origin = request.get('origin');

  if (origin === undefined || origin !== ADMIN_ORIGIN) {
    logger.warn('security.csrf_origin_rejected', {
      method: request.method,
      path: request.path,
      origin: origin ?? null,
    });
    response.status(403).json({ status: 'forbidden' });
    return;
  }

  next();
});

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

const serverErrorHandler = (
  /** @type {unknown} */ error,
  /** @type {import('express').Request} */ request,
  /** @type {import('express').Response} */ response,
  /** @type {import('express').NextFunction} */ next,
) => {
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
