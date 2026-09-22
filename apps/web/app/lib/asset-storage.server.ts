import { createHash, createHmac } from 'node:crypto';

import { parseAssetStorageEnv } from '@akiksystems/config/env';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
]);

export const assetUploadMaxBytes = 10 * 1024 * 1024;

export function validateAssetUpload(file: File): void {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error(
      'Unsupported asset type. Allowed: JPEG, PNG, WebP, AVIF, and PDF.',
    );
  }

  if (file.size <= 0) {
    throw new Error('Asset file must not be empty.');
  }

  if (file.size > assetUploadMaxBytes) {
    throw new Error('Asset file exceeds the 10 MiB upload limit.');
  }
}

function hasPrefix(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

export function validateAssetSignature(
  mimeType: string,
  bytes: Uint8Array,
): void {
  const valid =
    mimeType === 'image/jpeg'
      ? hasPrefix(bytes, [0xff, 0xd8, 0xff])
      : mimeType === 'image/png'
        ? hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        : mimeType === 'image/webp'
          ? ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP'
          : mimeType === 'image/avif'
            ? ascii(bytes, 4, 4) === 'ftyp' &&
              ['avif', 'avis'].includes(ascii(bytes, 8, 4))
            : mimeType === 'application/pdf'
              ? ascii(bytes, 0, 5) === '%PDF-'
              : false;

  if (!valid) {
    throw new Error('Asset contents do not match the declared file type.');
  }
}

export function assetExtensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/avif':
      return 'avif';
    case 'application/pdf':
      return 'pdf';
    default:
      throw new Error('Unsupported asset MIME type.');
  }
}

function sha256Hex(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hmac(key: Uint8Array | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function amzDateParts(now: Date): { amzDate: string; dateStamp: string } {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function encodedObjectKey(storageKey: string): string {
  return storageKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function objectUrl(storageKey: string): URL {
  const env = parseAssetStorageEnv(process.env);
  const endpoint = new URL(env.ENDPOINT);
  const authority = endpoint.port
    ? `${env.BUCKET}.${endpoint.hostname}:${endpoint.port}`
    : `${env.BUCKET}.${endpoint.hostname}`;

  return new URL(
    `${endpoint.protocol}//${authority}/${encodedObjectKey(storageKey)}`,
  );
}

async function signedS3Request(
  method: 'GET' | 'PUT' | 'DELETE',
  storageKey: string,
  body?: Uint8Array,
  contentType?: string,
  range?: string,
): Promise<Response> {
  const env = parseAssetStorageEnv(process.env);
  const url = objectUrl(storageKey);
  const payload = body ?? new Uint8Array();
  const payloadHash = sha256Hex(payload);
  const { amzDate, dateStamp } = amzDateParts(new Date());
  const canonicalHeaders =
    `host:${url.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    method,
    url.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${env.REGION}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const dateKey = hmac(`AWS4${env.SECRET_ACCESS_KEY}`, dateStamp);
  const regionKey = hmac(dateKey, env.REGION);
  const serviceKey = hmac(regionKey, 's3');
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = createHmac('sha256', signingKey)
    .update(stringToSign)
    .digest('hex');

  const headers = new Headers({
    authorization:
      `AWS4-HMAC-SHA256 Credential=${env.ACCESS_KEY_ID}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  });

  if (contentType !== undefined) {
    headers.set('content-type', contentType);
  }

  if (range !== undefined) {
    headers.set('range', range);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method === 'PUT' ? Buffer.from(payload) : undefined,
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(
      `Object storage ${method} failed with ${response.status}: ${details}`,
    );
  }

  return response;
}

export async function putAssetObject(
  storageKey: string,
  file: File,
): Promise<void> {
  validateAssetUpload(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  validateAssetSignature(file.type, bytes);
  await signedS3Request('PUT', storageKey, bytes, file.type);
}

export async function deleteAssetObject(storageKey: string): Promise<void> {
  await signedS3Request('DELETE', storageKey);
}

export async function getAssetObject(storageKey: string): Promise<Response> {
  return signedS3Request('GET', storageKey);
}

export async function getAssetObjectRange(
  storageKey: string,
  start = 0,
  end = 65_535,
): Promise<Uint8Array> {
  const response = await signedS3Request(
    'GET',
    storageKey,
    undefined,
    undefined,
    `bytes=${start}-${end}`,
  );
  return new Uint8Array(await response.arrayBuffer());
}
