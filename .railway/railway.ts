import { defineRailway, github, project, service } from 'railway/iac';

export default defineRailway((_ctx) => {
  const source = github('AmineAKIK/akiksystems-platform', { branch: 'main' });

  const web = service('web', {
    source,
    build: 'pnpm --filter @akiksystems/web build',
    start: 'node server.js',
    replicas: {
      'europe-west4': 1,
    },
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
    },
  });

  return project('akiksystems-platform', {
    resources: [web],
  });
});
