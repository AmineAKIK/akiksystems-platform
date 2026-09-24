# Railway infrastructure

Railway infrastructure for the AkikSystems platform is defined in
`.railway/railway.ts`.

## Current scope

The Railway definition is the shared infrastructure contract for both
`staging` and `production`.

Each environment contains:

- the `web` service sourced from `AmineAKIK/akiksystems-platform` on `main`;
- the `worker` service running Graphile Worker from the same repository;
- one Railway-managed PostgreSQL service;
- `DATABASE_URL` wired from both application services to PostgreSQL over
  Railway's internal service reference;
- `pnpm db:migrate` as the web pre-deploy migration command;
- `PORT=3000` for the web runtime;
- one web replica and one worker replica in Railway's Europe region.

## Safe workflow

Always target the intended environment explicitly before planning or applying
infrastructure:

```bash
railway link --project akiksystems-platform --environment staging
railway config plan
railway config apply

railway link --project akiksystems-platform --environment production
railway config plan
railway config apply
```

Staging and production use isolated PostgreSQL, worker and object-storage
resources. Production changes are allowed from this definition and must be
reviewed with the same plan/apply discipline as staging.
