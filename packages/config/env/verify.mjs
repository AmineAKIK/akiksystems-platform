import { strict as assert } from 'node:assert';

import { parseWebServerEnv, toPublicWebEnv } from './index.mjs';

const web = parseWebServerEnv({
  NODE_ENV: 'production',
  PORT: '3000',
});
assert.equal(web.PORT, 3000);
assert.equal(web.NODE_ENV, 'production');

const publicWeb = toPublicWebEnv(web);
assert.deepEqual(publicWeb, { environment: 'production' });

assert.throws(
  () => parseWebServerEnv({ NODE_ENV: 'production', PORT: '70000' }),
  /Invalid web server configuration: PORT:/,
);

process.stdout.write('Runtime configuration contract verification passed.\n');
