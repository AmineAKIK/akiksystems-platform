import { parseAuthEnv } from '@akiksystems/config/env';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { twoFactor } from 'better-auth/plugins';
import { Pool } from 'pg';

export interface CreateAuthOptions {
  allowSignUp?: boolean;
}

export function createAuthInstance({ allowSignUp = false }: CreateAuthOptions = {}) {
  const env = parseAuthEnv(process.env);
  const database = new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    allowExitOnIdle: true,
  });

  const auth = betterAuth({
    appName: 'AkikSystems',
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL],
    secret: env.BETTER_AUTH_SECRET,
    database,
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignUp,
      autoSignIn: false,
      minPasswordLength: 14,
      maxPasswordLength: 128,
    },
    disabledPaths: allowSignUp ? [] : ['/sign-up/email'],
    session: {
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 60,
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': {
          window: 60,
          max: 5,
        },
        '/two-factor/*': {
          window: 60,
          max: 5,
        },
      },
    },
    advanced: {
      database: {
        // Better Auth documents rateLimit.lastRequest as PostgreSQL bigint.
        // Runtime schema validation currently reports int8 as a type mismatch,
        // so deployment migrations remain authoritative and runtime validation
        // is disabled to avoid a false-positive production warning.
        validateSchema: false,
      },
      cookiePrefix: 'akiksystems-admin',
      useSecureCookies: env.NODE_ENV === 'production',
      defaultCookieAttributes: {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const normalizedEmail = user.email.trim().toLowerCase();

            if (normalizedEmail !== env.ADMIN_EMAIL) {
              throw new APIError('FORBIDDEN', {
                message: 'This identity is not permitted to create an administrator account.',
              });
            }

            return {
              data: {
                ...user,
                email: normalizedEmail,
              },
            };
          },
        },
      },
    },
    plugins: [
      twoFactor({
        issuer: 'AkikSystems',
      }),
    ],
    telemetry: {
      enabled: false,
    },
  });

  return {
    auth,
    database,
    env,
  };
}
