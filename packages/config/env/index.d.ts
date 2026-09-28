export type NodeEnvironment = 'development' | 'test' | 'production';

export interface WebServerEnv {
  NODE_ENV: NodeEnvironment;
  PORT: number;
}

export interface PublicWebEnv {
  readonly environment: NodeEnvironment;
}

export function parseWebServerEnv(source?: NodeJS.ProcessEnv): WebServerEnv;
export function toPublicWebEnv(env: WebServerEnv): PublicWebEnv;
