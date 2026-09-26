import { z } from 'zod';

const nodeEnvironmentSchema = z.enum(['development', 'test', 'production']).default('development');

const portSchema = z.coerce
  .number()
  .int()
  .min(1, 'PORT must be between 1 and 65535.')
  .max(65535, 'PORT must be between 1 and 65535.')
  .default(3000);

const databaseUrlSchema = z
  .string()
  .trim()
  .min(1, 'DATABASE_URL must not be empty.')
  .url('DATABASE_URL must be a valid URL.')
  .refine(
    (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
    'DATABASE_URL must use the postgres:// or postgresql:// scheme.',
  );

const authUrlSchema = z
  .string()
  .trim()
  .url('BETTER_AUTH_URL must be a valid URL.')
  .refine(
    (value) => value.startsWith('http://') || value.startsWith('https://'),
    'BETTER_AUTH_URL must use the http:// or https:// scheme.',
  );

const adminEmailSchema = z
  .string()
  .trim()
  .email('ADMIN_EMAIL must be a valid email address.')
  .transform((value) => value.toLowerCase());

const authEnvironmentSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema,
  DATABASE_URL: databaseUrlSchema,
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET must contain at least 32 characters.'),
  BETTER_AUTH_URL: authUrlSchema,
  ADMIN_EMAIL: adminEmailSchema,
});

const assetStorageSchema = z.object({
  BUCKET: z.string().trim().min(1, 'BUCKET must not be empty.'),
  REGION: z.string().trim().min(1, 'REGION must not be empty.'),
  ENDPOINT: z
    .string()
    .trim()
    .url('ENDPOINT must be a valid URL.')
    .refine(
      (value) => value.startsWith('https://'),
      'ENDPOINT must use the https:// scheme.',
    ),
  ACCESS_KEY_ID: z.string().trim().min(1, 'ACCESS_KEY_ID must not be empty.'),
  SECRET_ACCESS_KEY: z
    .string()
    .min(1, 'SECRET_ACCESS_KEY must not be empty.'),
});

const webServerSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema,
  PORT: portSchema,
  DATABASE_URL: databaseUrlSchema.optional(),
});

const workerSchema = z
  .object({
    NODE_ENV: nodeEnvironmentSchema,
    DATABASE_URL: databaseUrlSchema,
    WORK_WITH_US_EMAIL_PROVIDER: z.enum(['resend']).optional(),
    RESEND_API_KEY: z.string().trim().min(1).optional(),
    WORK_WITH_US_EMAIL_FROM: z.string().trim().min(3).max(320).optional(),
  })
  .superRefine((value, context) => {
    const configured =
      value.WORK_WITH_US_EMAIL_PROVIDER !== undefined ||
      value.RESEND_API_KEY !== undefined ||
      value.WORK_WITH_US_EMAIL_FROM !== undefined;

    if (!configured) return;

    if (value.WORK_WITH_US_EMAIL_PROVIDER === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['WORK_WITH_US_EMAIL_PROVIDER'],
        message: 'WORK_WITH_US_EMAIL_PROVIDER is required when email transport is configured.',
      });
    }

    if (value.RESEND_API_KEY === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY is required when the Resend transport is configured.',
      });
    }

    if (value.WORK_WITH_US_EMAIL_FROM === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['WORK_WITH_US_EMAIL_FROM'],
        message: 'WORK_WITH_US_EMAIL_FROM is required when email transport is configured.',
      });
    }
  });

const databaseCommandSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
});

const adminBootstrapSchema = authEnvironmentSchema.extend({
  ADMIN_PASSWORD: z
    .string()
    .min(14, 'ADMIN_PASSWORD must contain at least 14 characters.')
    .max(128, 'ADMIN_PASSWORD must contain at most 128 characters.'),
});

function formatConfigError(scope, error) {
  const details = error.issues
    .map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'environment';
      return `${field}: ${issue.message}`;
    })
    .join('; ');

  return new Error(`Invalid ${scope} configuration: ${details}`);
}

function parse(schema, source, scope) {
  const result = schema.safeParse(source);

  if (!result.success) {
    throw formatConfigError(scope, result.error);
  }

  return result.data;
}

export function parseWebServerEnv(source = process.env) {
  return parse(webServerSchema, source, 'web server');
}

export function parseWorkerEnv(source = process.env) {
  return parse(workerSchema, source, 'worker');
}

export function parseDatabaseCommandEnv(source = process.env) {
  return parse(databaseCommandSchema, source, 'database command');
}

export function parseAuthEnv(source = process.env) {
  return parse(authEnvironmentSchema, source, 'authentication');
}

export function parseAdminBootstrapEnv(source = process.env) {
  return parse(adminBootstrapSchema, source, 'administrator bootstrap');
}

export function parseAssetStorageEnv(source = process.env) {
  return parse(assetStorageSchema, source, 'asset storage');
}

export function toPublicWebEnv(env) {
  return Object.freeze({
    environment: env.NODE_ENV,
  });
}
