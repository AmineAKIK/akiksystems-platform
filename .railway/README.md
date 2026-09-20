# Railway infrastructure

Railway infrastructure for the AkikSystems platform is defined in
`.railway/railway.ts`.

## Current scope

The definition is intentionally restricted to the `staging` environment until
production infrastructure is qualified later in the backlog.

Staging contains:

- the `web` service sourced from `AmineAKIK/akiksystems-platform` on `main`;
- the `worker` service running Graphile Worker from the same repository;
- one Railway-managed PostgreSQL service named `Postgres`;
- `DATABASE_URL` wired from both application services to PostgreSQL over
  Railway's internal service reference;
- `pnpm db:migrate` as the web pre-deploy migration command;
- `PORT=3000` for the web runtime;
- one web replica and one worker replica in Railway's Europe region.

## Safe workflow

Always target staging explicitly:

```bash
railway link --project akiksystems-platform --environment staging
railway config plan
railway config apply
```

The TypeScript definition throws when evaluated against a non-staging
environment so that production cannot be changed accidentally from this file.
