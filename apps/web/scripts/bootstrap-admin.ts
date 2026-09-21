import { parseAdminBootstrapEnv } from '@akiksystems/config/env';

import { createAuthInstance } from '../app/lib/auth.factory.server';

const env = parseAdminBootstrapEnv(process.env);
const instance = createAuthInstance({ allowSignUp: true });

try {
  const existing = await instance.database.query<{ email: string }>(
    'select "email" from "user" order by "createdAt" asc limit 2',
  );

  if (existing.rows.length > 1) {
    throw new Error('Administrator bootstrap refused: more than one auth user already exists.');
  }

  if (existing.rows.length === 1) {
    const existingEmail = existing.rows[0]?.email.trim().toLowerCase();

    if (existingEmail !== env.ADMIN_EMAIL) {
      throw new Error(
        'Administrator bootstrap refused: the existing auth user does not match ADMIN_EMAIL.',
      );
    }

    console.info('[auth] administrator already provisioned; no change required.');
  } else {
    await instance.auth.api.signUpEmail({
      body: {
        email: env.ADMIN_EMAIL,
        name: 'AkikSystems Administrator',
        password: env.ADMIN_PASSWORD,
      },
    });

    console.info('[auth] administrator provisioned through the server-only bootstrap path.');
  }
} finally {
  await instance.database.end();
}
