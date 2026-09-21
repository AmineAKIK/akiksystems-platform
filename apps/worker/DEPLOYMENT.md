# Worker deployment notes

The staging worker is intentionally stateless. Durable state lives in PostgreSQL through
`DATABASE_URL`, so worker rebuilds and restarts must not affect published portfolio content.
