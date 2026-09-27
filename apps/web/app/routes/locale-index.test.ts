import { describe, expect, it } from 'vitest';

import { loader } from './locale-index';

describe('locale index', () => {
  it.each([
    ['https://akiksystems.fr/', '/fr'],
    ['https://www.akiksystems.fr/', '/fr'],
    ['https://akiksystems.com/', '/en'],
    ['http://localhost:3001/', '/en'],
  ])('redirects %s to %s', (url, expected) => {
    const response = loader({ request: new Request(url) } as never);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(expected);
  });
});
