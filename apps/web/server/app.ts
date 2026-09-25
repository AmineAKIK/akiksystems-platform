import { createRequestHandler } from '@react-router/express';
import express, { type Application } from 'express';
import type { ServerBuild } from 'react-router';

export const app: Application = express();

function runtimeAllowedActionOrigins(build: ServerBuild): string[] | undefined {
  const publicUrl = process.env.BETTER_AUTH_URL;

  const configured = Array.isArray(build.allowedActionOrigins)
    ? build.allowedActionOrigins
    : [];

  if (publicUrl === undefined) {
    return configured.length === 0 ? undefined : configured;
  }

  const publicHost = new URL(publicUrl).host;

  return [...new Set([...configured, publicHost])];
}

async function getBuild(): Promise<ServerBuild> {
  const build = (await import(
    'virtual:react-router/server-build'
  )) as ServerBuild;

  return {
    ...build,
    allowedActionOrigins: runtimeAllowedActionOrigins(build),
  };
}

app.use(
  createRequestHandler({
    build: getBuild,
  }),
);
