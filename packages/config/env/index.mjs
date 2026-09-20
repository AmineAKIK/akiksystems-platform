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

const webServerSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema,
  PORT: portSchema,
  DATABASE_URL: databaseUrlSchema.optional(),
});

const workerSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema,
  DATABASE_URL: databaseUrlSchema,
});

const databaseCommandSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
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

export function toPublicWebEnv(env) {
  return Object.freeze({
    environment: env.NODE_ENV,
  });
}
