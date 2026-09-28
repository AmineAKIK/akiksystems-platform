import { createHash, randomUUID } from 'node:crypto';
import { PassThrough } from 'node:stream';

import { isbot } from 'isbot';
import type { RenderToPipeableStreamOptions } from 'react-dom/server';
import { renderToPipeableStream } from 'react-dom/server';
import { ServerRouter, type EntryContext } from 'react-router';

export const streamTimeout = 10_000;

function inlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>();

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attributes = match[1] ?? '';
    const body = match[2] ?? '';

    if (/\bsrc=/.test(attributes)) continue;

    hashes.add(createHash('sha256').update(body, 'utf8').digest('base64'));
  }

  return [...hashes];
}

function contentSecurityPolicy(nonce: string, scriptHashes: readonly string[]) {
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    ...scriptHashes.map((hash) => `'sha256-${hash}'`),
  ].join(' ');
  // Vite dev injects CSS as inline <style> tags and uses a websocket for HMR.
  const isDev = import.meta.env.DEV;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    isDev ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'",
    `script-src ${scriptSources}`,
    isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
  ].join('; ');
}

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  if (request.method.toUpperCase() === 'HEAD') {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  const nonce = randomUUID();

  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get('user-agent');
    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? 'onAllReady' : 'onShellReady';

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} nonce={nonce} url={request.url} />,
      {
        nonce,
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough();
          const chunks: Buffer[] = [];

          body.on('data', (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          body.once('error', reject);
          body.once('end', () => {
            if (timeoutId !== undefined) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
            }

            const html = Buffer.concat(chunks).toString('utf8');
            responseHeaders.set('Content-Type', 'text/html');
            responseHeaders.set(
              'Content-Security-Policy',
              contentSecurityPolicy(nonce, inlineScriptHashes(html)),
            );

            resolve(
              new Response(html, {
                headers: responseHeaders,
                status: responseStatusCode,
              }),
            );
          });

          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) console.error(error);
        },
      },
    );

    timeoutId = setTimeout(() => abort(), streamTimeout + 1_000);
  });
}
