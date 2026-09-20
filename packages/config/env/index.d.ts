export type NodeEnvironment = 'development' | 'test' | 'production';

export interface WebServerEnv {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  DATABASE_URL?: string;
}

export interface WorkerEnv {
  NODE_ENV: NodeEnvironment;
  DATABASE_URL: string;
}

export interface DatabaseCommandEnv {
  DATABASE_URL: string;
}

export interface PublicWebEnv {
  readonly environment: NodeEnvironment;
}

export function parseWebServerEnv(source?: NodeJS.ProcessEnv): WebServerEnv;
export function parseWorkerEnv(source?: NodeJS.ProcessEnv): WorkerEnv;
export function parseDatabaseCommandEnv(source?: NodeJS.ProcessEnv): DatabaseCommandEnv;
export function toPublicWebEnv(env: WebServerEnv): PublicWebEnv;
