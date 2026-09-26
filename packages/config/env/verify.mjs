import { strict as assert } from 'node:assert';

import {
  parseAdminBootstrapEnv,
  parseAssetStorageEnv,
  parseAuthEnv,
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

const auth = parseAuthEnv({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:secret@example.internal:5432/akiksystems',
  BETTER_AUTH_SECRET: '0123456789abcdef0123456789abcdef',
  BETTER_AUTH_URL: 'https://staging.example.com',
  ADMIN_EMAIL: 'Admin@Example.com',
});

assert.equal(auth.ADMIN_EMAIL, 'admin@example.com');

const bootstrap = parseAdminBootstrapEnv({
  ...auth,
  ADMIN_PASSWORD: 'a-strong-password-for-testing',
});

assert.equal(bootstrap.ADMIN_PASSWORD, 'a-strong-password-for-testing');

const storage = parseAssetStorageEnv({
  BUCKET: 'akiksystems-staging',
  REGION: 'auto',
  ENDPOINT: 'https://storage.example.com',
  ACCESS_KEY_ID: 'access-key',
  SECRET_ACCESS_KEY: 'secret-key',
});

assert.equal(storage.BUCKET, 'akiksystems-staging');
assert.equal(storage.REGION, 'auto');

const workerEmail = parseWorkerEnv({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:secret@example.internal:5432/akiksystems',
  WORK_WITH_US_EMAIL_PROVIDER: 'resend',
  RESEND_API_KEY: 're_test_key',
  WORK_WITH_US_EMAIL_FROM: 'AkikSystems <notifications@example.com>',
});

assert.equal(workerEmail.WORK_WITH_US_EMAIL_PROVIDER, 'resend');
assert.equal(workerEmail.RESEND_API_KEY, 're_test_key');

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

assert.throws(
  () =>
    parseAuthEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost/akiksystems',
      BETTER_AUTH_SECRET: 'too-short',
      BETTER_AUTH_URL: 'https://staging.example.com',
      ADMIN_EMAIL: 'admin@example.com',
    }),
  /Invalid authentication configuration: BETTER_AUTH_SECRET:/,
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
