# Web deployment notes

Railway uses `GET /health` as the web service healthcheck.

The endpoint only reports that the web process is running. It has no external
dependency: the application ships its content in code and uses no database,
worker, or object storage.

## Production

Staging and production deploy the `web` service from `main`. The build is
`pnpm --filter @akiksystems/web build` and the start command is
`node server.js`. The only runtime configuration is `NODE_ENV` and `PORT`.

There is no migration, bootstrap, or administrator step.
