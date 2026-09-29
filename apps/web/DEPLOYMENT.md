# Web deployment notes

Production runs on the AkikSystems VPS (OVHcloud) as a single container. The
full procedure, Compose file and Nginx reference live in
[`deploy/vps/`](../../deploy/vps/README.md).

## Contract

- The image is built from an exact Git commit SHA with `apps/web/Dockerfile`
  and tagged `akiksystems-web:<sha>`.
- The container starts with `node server.js`. The only runtime configuration is
  `NODE_ENV=production` and `PORT=3000`.
- The container port is never published publicly: Compose binds it to
  `127.0.0.1:3100` on the host.
- Nginx terminates HTTPS for the four public domains and forwards `Host`,
  `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Proto` and
  `X-Request-ID`. The app trusts exactly one proxy hop.
- `GET /health` is the healthcheck. It only reports that the web process is
  running and accepts any `Host`; every other path answers `421` for hostnames
  outside the four public domains and localhost.

There is no database, migration, bootstrap, worker or administrator step: the
content ships in the code.
