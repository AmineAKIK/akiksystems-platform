import { strict as assert } from 'node:assert';

import {
  parseAssetStorageEnv,
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

const storage = parseAssetStorageEnv({
  BUCKET: 'akiksystems-staging',
  REGION: 'auto',
  ENDPOINT: 'https://storage.example.com',
  ACCESS_KEY_ID: 'access-key',
  SECRET_ACCESS_KEY: 'secret-key',
});
assert.equal(storage.BUCKET, 'akiksystems-staging');

const workerEmail = parseWorkerEnv({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:secret@example.internal:5432/akiksystems',
  WORK_WITH_US_EMAIL_PROVIDER: 'resend',
  RESEND_API_KEY: 're_test_key',
  WORK_WITH_US_EMAIL_FROM: 'AkikSystems <notifications@example.com>',
});
assert.equal(workerEmail.WORK_WITH_US_EMAIL_PROVIDER, 'resend');

assert.throws(
  () => parseWorkerEnv({ NODE_ENV: 'production' }),
  /Invalid worker configuration: DATABASE_URL:/,
);
assert.throws(
  () =>
    parseWorkerEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:secret@example.internal:5432/akiksystems',
      WORK_WITH_US_EMAIL_PROVIDER: 'resend',
    }),
  /RESEND_API_KEY:.*required.*WORK_WITH_US_EMAIL_FROM:.*required|WORK_WITH_US_EMAIL_FROM:.*required.*RESEND_API_KEY:.*required/,
);
assert.throws(
  () => parseWebServerEnv({ NODE_ENV: 'production', PORT: '70000' }),
  /Invalid web server configuration: PORT:/,
);
assert.throws(
  () =>
    parseDatabaseCommandEnv({
      DATABASE_URL: 'https://example.com/not-postgres',
    }),
  /Invalid database command configuration: DATABASE_URL:/,
);
assert.throws(
  () =>
    parseAssetStorageEnv({
      BUCKET: 'akiksystems-staging',
      REGION: 'auto',
      ENDPOINT: 'http://insecure.example.com',
      ACCESS_KEY_ID: 'access-key',
      SECRET_ACCESS_KEY: 'secret-key',
    }),
  /Invalid asset storage configuration: ENDPOINT:/,
);

process.stdout.write('Runtime configuration contract verification passed.\n');
