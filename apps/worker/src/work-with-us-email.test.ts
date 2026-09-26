import type { WorkerEnv } from '@akiksystems/config/env';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWorkWithUsEmailTransport } from './work-with-us-email.js';

const configuredEnv: WorkerEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://example.invalid/akiksystems',
  WORK_WITH_US_EMAIL_PROVIDER: 'resend',
  RESEND_API_KEY: 're_test_secret',
  WORK_WITH_US_EMAIL_FROM: 'AkikSystems <notifications@example.invalid>',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Work with us email transport', () => {
  it('stays disabled when no provider secret is configured', () => {
    expect(
      createWorkWithUsEmailTransport({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://example.invalid/akiksystems',
      }),
    ).toBeNull();
  });

  it('sends a plain-text Resend request with provider idempotency', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const transport = createWorkWithUsEmailTransport(configuredEnv);
    expect(transport).not.toBeNull();

    const result = await transport!.send({
      to: 'admin@example.invalid',
      replyTo: 'visitor@example.invalid',
      subject: '[AkikSystems] Work with us · Visitor',
      text: 'Plain text inquiry',
      idempotencyKey: 'work-with-us-inquiry/123',
    });

    expect(result).toEqual({ messageId: 'email-123' });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer re_test_secret',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'work-with-us-inquiry/123',
    });

    expect(JSON.parse(String(init.body))).toEqual({
      from: 'AkikSystems <notifications@example.invalid>',
      to: ['admin@example.invalid'],
      reply_to: 'visitor@example.invalid',
      subject: '[AkikSystems] Work with us · Visitor',
      text: 'Plain text inquiry',
    });
  });

  it('surfaces provider rejection without pretending delivery succeeded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('sender domain is not verified', { status: 422 }),
      ),
    );

    const transport = createWorkWithUsEmailTransport(configuredEnv);

    await expect(
      transport!.send({
        to: 'admin@example.invalid',
        replyTo: 'visitor@example.invalid',
        subject: 'Inquiry',
        text: 'Message',
        idempotencyKey: 'work-with-us-inquiry/456',
      }),
    ).rejects.toThrow(/HTTP 422.*sender domain is not verified/);
  });
});
