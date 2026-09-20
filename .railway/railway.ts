import {
  defineRailway,
  github,
  postgres,
  project,
  service,
} from 'railway/iac';

export default defineRailway((ctx) => {
  if (!ctx.isEnvironment('staging')) {
    throw new Error(
      'This Railway IaC definition is intentionally staging-only for now. Target the staging environment explicitly.',
    );
  }

  const database = postgres('Postgres');

  const web = service('web', {
    source: github('AmineAKIK/akiksystems-platform', { branch: 'main' }),
    build: 'pnpm --filter @akiksystems/web build',
    start: 'pnpm --filter @akiksystems/web start',
    preDeploy: 'pnpm db:migrate',
    replicas: {
      'europe-west4': 1,
    },
    env: {
      DATABASE_URL: database.env.DATABASE_URL,
      NODE_ENV: 'production',
      PORT: '3000',
    },
  });

  return project('akiksystems-platform', {
    resources: [database, web],
  });
});
