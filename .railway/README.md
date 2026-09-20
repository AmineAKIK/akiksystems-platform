# Railway infrastructure

Railway infrastructure for the AkikSystems platform is defined in
`.railway/railway.ts`.

## Current scope

The definition is intentionally restricted to the `staging` environment until
production infrastructure is qualified later in the backlog.

Staging contains:

- the `web` service sourced from `AmineAKIK/akiksystems-platform` on `main`;
- one Railway-managed PostgreSQL service named `Postgres`;
- `DATABASE_URL` wired from the web service to PostgreSQL over Railway's
  internal service reference;
- `pnpm db:migrate` as the pre-deploy migration command;
- `PORT=3000`;
- one web replica in Railway's Europe region.

The worker is deliberately absent until AKS-005 creates a real worker runtime
with a start command.

## Safe workflow

Always target staging explicitly:

```bash
railway link --project akiksystems-platform --environment staging
railway config plan
railway config apply
```

The TypeScript definition throws when evaluated against a non-staging
environment so that production cannot be changed accidentally from this file.
