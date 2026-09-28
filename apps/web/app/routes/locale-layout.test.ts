import { describe, expect, it } from 'vitest';

import { loader } from './locale-layout';

async function redirectFor(url: string, locale: 'en' | 'fr') {
  try {
    await loader({
      params: { locale },
      request: new Request(url),
    } as never);
  } catch (error) {
    return error as Response;
  }

  return null;
}

describe('locale layout canonical domain redirects', () => {
  it.each([
    ['https://akiksystems.fr/en?x=1', 'en', 'https://akiksystems.com/en?x=1'],
    ['https://akiksystems.com/fr?x=1', 'fr', 'https://akiksystems.fr/fr?x=1'],
    ['https://www.akiksystems.fr/fr', 'fr', 'https://akiksystems.fr/fr'],
    ['https://www.akiksystems.com/en', 'en', 'https://akiksystems.com/en'],
  ] as const)('redirects %s to its canonical public domain', async (url, locale, expected) => {
    const response = await redirectFor(url, locale);
    expect(response).toBeInstanceOf(Response);
    expect(response?.status).toBe(308);
    expect(response?.headers.get('Location')).toBe(expected);
  });

  it('keeps local development requests on the local origin', () => {
    const result = loader({
      params: { locale: 'en' },
      request: new Request('http://localhost:3000/en'),
    } as never);

    expect(result).toEqual({ locale: 'en' });
  });
});
