export type NodeEnvironment = 'development' | 'test' | 'production';

export interface WebServerEnv {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  DATABASE_URL?: string;
}

export interface WorkerEnv {
  NODE_ENV: NodeEnvironment;
  DATABASE_URL: string;
  WORK_WITH_US_EMAIL_PROVIDER?: 'resend';
  RESEND_API_KEY?: string;
  WORK_WITH_US_EMAIL_FROM?: string;
}

export interface DatabaseCommandEnv {
  DATABASE_URL: string;
}

export interface AuthEnv {
  NODE_ENV: NodeEnvironment;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  ADMIN_EMAIL: string;
}

export interface AdminBootstrapEnv extends AuthEnv {
  ADMIN_PASSWORD: string;
}

export interface AssetStorageEnv {
  BUCKET: string;
  REGION: string;
  ENDPOINT: string;
  ACCESS_KEY_ID: string;
  SECRET_ACCESS_KEY: string;
}

export interface PublicWebEnv {
  readonly environment: NodeEnvironment;
}

export function parseWebServerEnv(source?: NodeJS.ProcessEnv): WebServerEnv;
export function parseWorkerEnv(source?: NodeJS.ProcessEnv): WorkerEnv;
export function parseDatabaseCommandEnv(source?: NodeJS.ProcessEnv): DatabaseCommandEnv;
export function parseAuthEnv(source?: NodeJS.ProcessEnv): AuthEnv;
export function parseAdminBootstrapEnv(source?: NodeJS.ProcessEnv): AdminBootstrapEnv;
export function parseAssetStorageEnv(source?: NodeJS.ProcessEnv): AssetStorageEnv;
export function toPublicWebEnv(env: WebServerEnv): PublicWebEnv;
