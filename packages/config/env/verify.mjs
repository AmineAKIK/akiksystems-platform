import { strict as assert } from 'node:assert';

import {
  parseAdminBootstrapEnv,
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

process.stdout.write('Runtime configuration contract verification passed.\n');
