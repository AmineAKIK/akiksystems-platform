# Web deployment notes

Railway uses `GET /health` as the web service healthcheck.

The endpoint probes PostgreSQL and represents runtime liveness. Content routes
may intentionally return 404 when a resource is not public, so they must not be
used as infrastructure healthchecks.

## Production

Normal staging and production deploys use:

```sh
pnpm deploy:migrate
```

The command applies the application database migrations before the new web
deployment becomes active.

There is no administrator bootstrap or authentication migration step.
