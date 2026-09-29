import { randomUUID } from 'node:crypto';
import process from 'node:process';

import { parseWebServerEnv } from '@akiksystems/config/env';
import { createLogger, runWithObservabilityContext } from '@akiksystems/config/observability';
import express from 'express';

const BUILD_PATH = './build/server/index.js';
const env = parseWebServerEnv(process.env);
const DEVELOPMENT = env.NODE_ENV === 'development';
const PORT = env.PORT;
const logger = createLogger({ service: 'web' });

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const noIndexDirective = 'noindex, nofollow, noarchive, nosnippet';

const allowedPublicHostnames = new Set([
  'akiksystems.com',
  'www.akiksystems.com',
  'akiksystems.fr',
  'www.akiksystems.fr',
]);

/** @param {string} hostname */
function isAllowedHostname(hostname) {
  const normalized = hostname.toLowerCase();
  return (
    allowedPublicHostnames.has(normalized) ||
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1'
  );
}

/** @type {Record<'en' | 'fr', Array<[string, string]>>} */
const publicSitemapEntries = {
  en: [
    ['/en', '/fr'],
    ['/en/profile', '/fr/profil'],
    ['/en/systems', '/fr/systems'],
    ['/en/privacy', '/fr/confidentialite'],
    ['/en/legal-notice', '/fr/mentions-legales'],
    ['/en/cookies', '/fr/cookies'],
  ],
  fr: [
    ['/fr', '/en'],
    ['/fr/profil', '/en/profile'],
    ['/fr/systems', '/en/systems'],
    ['/fr/confidentialite', '/en/privacy'],
    ['/fr/mentions-legales', '/en/legal-notice'],
    ['/fr/cookies', '/en/cookies'],
  ],
};

/** @param {string} hostname @returns {'en' | 'fr'} */
function sitemapLocaleForHostname(hostname) {
  return hostname.toLowerCase().replace(/^www\./, '') === 'akiksystems.fr' ? 'fr' : 'en';
}

/** @param {'en' | 'fr'} locale */
function sitemapXml(locale) {
  const origin = locale === 'fr' ? 'https://akiksystems.fr' : 'https://akiksystems.com';
  const alternateOrigin = locale === 'fr' ? 'https://akiksystems.com' : 'https://akiksystems.fr';

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    publicSitemapEntries[locale]
      .map(
        ([path, alternatePath]) =>
          '  <url>\n' +
          '    <loc>' +
          origin +
          path +
          '</loc>\n' +
          '    <xhtml:link rel="alternate" hreflang="' +
          locale +
          '" href="' +
          origin +
          path +
          '" />\n' +
          '    <xhtml:link rel="alternate" hreflang="' +
          (locale === 'fr' ? 'en' : 'fr') +
          '" href="' +
          alternateOrigin +
          alternatePath +
          '" />\n' +
          '    <xhtml:link rel="alternate" hreflang="x-default" href="' +
          (locale === 'en' ? origin + path : alternateOrigin + alternatePath) +
          '" />\n' +
          '  </url>',
      )
      .join('\n') +
    '\n</urlset>\n'
  );
}

app.use((request, response, next) => {
  const writeHead = response.writeHead;
  response.writeHead = function writeHeadWithRobots(statusCode, ...args) {
    response.removeHeader('X-Powered-By');
    if (statusCode === 404 && !response.hasHeader('X-Robots-Tag')) {
      response.setHeader('X-Robots-Tag', noIndexDirective);
    }

    return Reflect.apply(writeHead, this, [statusCode, ...args]);
  };

  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  );
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('X-Frame-Options', 'DENY');

  if (env.NODE_ENV === 'production') {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

app.use((request, response, next) => {
  if (request.path !== '/health' && !isAllowedHostname(request.hostname)) {
    response.status(421).type('text/plain').send('Misdirected Request');
    return;
  }

  next();
});

app.get('/robots.txt', (request, response) => {
  const locale = sitemapLocaleForHostname(request.hostname);
  const origin = locale === 'fr' ? 'https://akiksystems.fr' : 'https://akiksystems.com';

  response
    .type('text/plain')
    .send('User-agent: *\nAllow: /\nSitemap: ' + origin + '/sitemap.xml\n');
});

app.get('/sitemap.xml', (request, response) => {
  response.type('application/xml').send(sitemapXml(sitemapLocaleForHostname(request.hostname)));
});

/** @param {unknown} value @returns {string | undefined} */
function normalizeRequestId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : undefined;
}

app.use((request, response, next) => {
  const requestId = normalizeRequestId(request.get('x-request-id')) ?? randomUUID();
  const correlationId = normalizeRequestId(request.get('x-correlation-id')) ?? requestId;
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

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'web' });
});

if (env.NODE_ENV === 'test') {
  app.get('/__test/server-error', () => {
    throw new Error('Synthetic server failure');
  });
}

if (DEVELOPMENT) {
  const viteDevServer = await import('vite').then((vite) =>
    vite.createServer({ server: { middlewareMode: true } }),
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
    response.status(500).json({ status: 'error', requestId });
  }
};

app.use(serverErrorHandler);

const server = app.listen(PORT, () => {
  logger.info('web.started', { port: PORT, environment: env.NODE_ENV });
});

let stopping = false;

/** @param {NodeJS.Signals} signal */
async function shutdown(signal) {
  if (stopping) return;

  stopping = true;
  logger.info('web.shutdown.started', { signal });

  server.close((error) => {
    if (error !== undefined) {
      logger.error('web.shutdown.error', error, { signal });
    }

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
