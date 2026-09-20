import { strict as assert } from 'node:assert';

import {
  parseDatabaseCommandEnv,
  parseWebServerEnv,
  parseWorkerEnv,
  toPublicWebEnv,
} from './index.mjs';

const web = parseWebServerEnv({
  NODE_ENV: 'production',
  PORT: '3000',
  DATABASE_URL: 'postgresql://user:secret@example.internal:5432/akiksystems',
});

assert.equal(web.PORT, 3000);
assert.equal(web.NODE_ENV, 'production');

const publicWeb = toPublicWebEnv(web);
assert.deepEqual(publicWeb, { environment: 'production' });
assert.equal('DATABASE_URL' in publicWeb, false);

assert.throws(
  () => parseWorkerEnv({ NODE_ENV: 'production' }),
  /Invalid worker configuration: DATABASE_URL:/,
);

assert.throws(
  () =>
    parseWebServerEnv({
      NODE_ENV: 'production',
      PORT: '70000',
    }),
  /Invalid web server configuration: PORT:/,
);

assert.throws(
  () =>
    parseDatabaseCommandEnv({
      DATABASE_URL: 'https://example.com/not-postgres',
    }),
  /Invalid database command configuration: DATABASE_URL:/,
);

process.stdout.write('Runtime configuration contract verification passed.\n');
