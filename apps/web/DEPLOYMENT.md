# Web deployment notes

Railway staging must use `GET /health` as the web service healthcheck.

That endpoint probes PostgreSQL and represents runtime liveness. Content routes such as
`/:locale/systems/:slug` are publication-dependent and may intentionally return 404, so they
must not be used as infrastructure healthchecks.
