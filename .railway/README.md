# Railway infrastructure

AkikSystems now has one application runtime: the public web service.

The application is code-only. Railway does not need PostgreSQL, a background worker, database migrations, object-storage credentials, or editorial infrastructure for the current site.

## Target topology

Each environment contains:

- the `web` service sourced from `AmineAKIK/akiksystems-platform` on `main`;
- `NODE_ENV=production`;
- `PORT=3000`;
- one web replica in Railway's Europe region.

The web healthcheck is `GET /health` and verifies only that the web process is healthy.

Legacy PostgreSQL and worker services can be removed from Railway after this code-only deployment is live. They are not part of the target architecture and the application no longer depends on them.
