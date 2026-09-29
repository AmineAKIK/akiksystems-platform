# AkikSystems VPS deployment

Production is one web container built from an exact Git commit, published on
`127.0.0.1:3100` and served publicly by Nginx on the OVHcloud VPS for
`akiksystems.com`, `www.akiksystems.com`, `akiksystems.fr` and
`www.akiksystems.fr`. The application is code-only: no database, migration,
worker or volume.

| File                 | Role                                                          |
| -------------------- | ------------------------------------------------------------- |
| `compose.yml`        | Build and run the hardened web container.                     |
| `nginx.conf.example` | Reference vhost: HTTPS, `www` redirects, proxy to 3100.       |
| `deploy.sh`          | Root deployment script (`/usr/local/bin/akiksystems-deploy`). |
| `deploy-ssh.sh`      | Forced SSH command (`/usr/local/bin/akiksystems-deploy-ssh`). |
| `sudoers.example`    | The single sudo rule of the deployment account.               |

The commands below assume a shell in the deployment checkout of this
repository on the VPS, with `GIT_SHA` set to the **full 40-character** SHA of
`main` that passed CI.

## Rules

- Never run `docker compose down -v`, `docker volume rm`, or any
  `docker system prune`/`docker volume prune`.
- Never stop, restart or modify other applications, containers or PM2
  processes on the VPS.
- The previous site (PM2 `akiksystems-site` on port 3000) stays running during
  preparation, switch-over and the whole validation window. Its logs are not
  deleted during the deployment.
- `nginx -t` must pass before every `systemctl reload nginx`.

## 1. Check out the exact commit

```sh
export GIT_SHA=<full 40-character SHA of main>
git fetch --prune origin
git checkout --detach "$GIT_SHA"
test "$(git rev-parse HEAD)" = "$GIT_SHA"
git status --porcelain   # must print nothing
```

## 2. Build the candidate

```sh
docker compose -f deploy/vps/compose.yml build --pull web
docker image inspect "akiksystems-web:$GIT_SHA" \
  --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}'
# must print $GIT_SHA
```

## 3. Start it next to the current site

```sh
docker compose -f deploy/vps/compose.yml up -d --no-build web
```

The container listens on `127.0.0.1:3100` only; the current site keeps serving
the public traffic from port 3000.

## 4. Health check before switching

```sh
for i in $(seq 1 30); do
  status="$(docker inspect --format '{{ .State.Health.Status }}' akiksystems-platform-web-1)"
  [ "$status" = healthy ] && break
  sleep 2
done
test "$status" = healthy

curl -fsS http://127.0.0.1:3100/health
curl -fsS -o /dev/null -w '%{http_code}\n' -H 'Host: akiksystems.com' http://127.0.0.1:3100/en        # 200
curl -fsS -o /dev/null -w '%{http_code}\n' -H 'Host: akiksystems.fr'  http://127.0.0.1:3100/fr        # 200
curl -fsS -o /dev/null -w '%{http_code}\n' -H 'Host: akiksystems.fr'  http://127.0.0.1:3100/fr/profil # 200
curl -s   -o /dev/null -w '%{http_code}\n' -H 'Host: 79.137.34.84'    http://127.0.0.1:3100/en        # 421
```

Do not switch Nginx unless every check passes.

## 5. Back up the current vhost

```sh
backup="/etc/nginx/sites-available/akiksystems.conf.$(date +%Y%m%d-%H%M%S).bak"
sudo cp -a /etc/nginx/sites-available/akiksystems.conf "$backup"
echo "$backup"
```

Keep the printed path: it is the rollback target. The backup lives in
`sites-available`, which is not loaded by Nginx.

## 6. Switch Nginx to the container

Update `/etc/nginx/sites-available/akiksystems.conf` from
`deploy/vps/nginx.conf.example` (upstream `127.0.0.1:3100`, single HSTS header,
`proxy_hide_header Strict-Transport-Security`, no include of
`/etc/nginx/conf.d/security-headers.conf`). Keep the `listen`/`http2` syntax of
the Nginx version installed on the VPS.

```sh
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Public checks on the four domains

```sh
for url in https://akiksystems.com/en https://akiksystems.fr/fr \
           https://akiksystems.com/health https://akiksystems.fr/fr/profil; do
  curl -fsS -o /dev/null -w "%{http_code} $url\n" "$url"
done

# Redirects: www and plain HTTP go to the bare HTTPS domain (301).
for url in https://www.akiksystems.com/ https://www.akiksystems.fr/ \
           http://akiksystems.com/ http://akiksystems.fr/ \
           http://www.akiksystems.com/ http://www.akiksystems.fr/; do
  curl -sS -o /dev/null -w "%{http_code} %{redirect_url} <- $url\n" "$url"
done

# Exactly one HSTS header, one CSP header, and a request id from Nginx.
curl -sSI https://akiksystems.com/en | grep -ci '^strict-transport-security:'   # 1
curl -sSI https://akiksystems.com/en | grep -ci '^content-security-policy:'     # 1
curl -sSI https://akiksystems.com/en | grep -i '^x-request-id:'
```

Then open both domains in a browser and check the Home, Systems and Profile
pages. The previous site keeps running until the validation window is closed.

## Rollback

Nginx goes back to the previous site on `127.0.0.1:3000`:

```sh
sudo cp -a "$backup" /etc/nginx/sites-available/akiksystems.conf
sudo nginx -t
sudo systemctl reload nginx
```

The candidate container can then be stopped without touching anything else:

```sh
docker compose -f deploy/vps/compose.yml stop web
```

## Later releases

Releases are automatic: every commit on `main` whose CI succeeded is deployed
by `.github/workflows/deploy.yml` (see below). Manual deployments and rollbacks
go through the same root script:

```sh
sudo /usr/local/bin/akiksystems-deploy <full SHA>                  # newer commit of main
sudo /usr/local/bin/akiksystems-deploy --allow-older <full SHA>    # rollback to an older one
journalctl -t akiksystems-deploy                                   # deployment history
```

## Automatic deployment

```text
GitHub Actions (CI green on main, environment "production")
  -> ssh akiksystems-deploy@VPS "deploy <sha>"      (one attempt, pinned host key)
  -> forced command /usr/local/bin/akiksystems-deploy-ssh   (validates "deploy <40-hex>")
  -> sudo -n /usr/local/bin/akiksystems-deploy <sha>        (single sudo rule)
```

The root script, per deployment:

1. accepts only a full lowercase SHA, takes a non-blocking `flock`, restarts
   itself with an empty environment;
2. refuses to run with less than 10 GiB or 15 % free where Docker stores
   images, a dirty checkout, or an unexpected `origin`;
3. fetches `origin/main` and refuses a commit that is not on it; a commit older
   than production is skipped unless `--allow-older` is given;
4. checks out the SHA, builds `akiksystems-web:<sha>` and checks its revision
   label;
5. replaces the `web` container (2 to 5 seconds of interruption), waits up to
   120 s for `healthy`, checks the image and `/health`, `/en`, `/fr`,
   `/fr/profil` and a `421` for an unknown host on `127.0.0.1:3100`;
6. on success records the SHA in `/var/lib/akiksystems-deploy/current-sha`
   (initialised from the running container the first time) and keeps the five
   newest images plus the previous one; on failure restores the previous
   checkout and image and verifies them again;
7. logs every step to the job output and to journald
   (`journalctl -t akiksystems-deploy`).

It never runs `compose down`, prunes, or touches volumes, networks, Nginx or
any other project.

### One-time server setup

```sh
sudo useradd --system --create-home --shell /bin/sh akiksystems-deploy
sudo install -o root -g root -m 0755 deploy/vps/deploy.sh     /usr/local/bin/akiksystems-deploy
sudo install -o root -g root -m 0755 deploy/vps/deploy-ssh.sh /usr/local/bin/akiksystems-deploy-ssh
sudo install -o root -g root -m 0440 deploy/vps/sudoers.example /etc/sudoers.d/akiksystems-deploy
sudo visudo -cf /etc/sudoers.d/akiksystems-deploy
```

The checkout in `/var/www/akiksystems-platform` must be owned by root (the
script runs `git` as root), with no write access for `akiksystems-deploy`.

`~akiksystems-deploy/.ssh/authorized_keys` (directory `0700`, file `0600`)
holds the public half of a key generated off the server:

```text
command="/usr/local/bin/akiksystems-deploy-ssh",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 AAAA... github-actions-deploy
```

Reinstall both scripts from an audited commit whenever `deploy.sh` or
`deploy-ssh.sh` changes: the server never runs the repository copies.

### GitHub side

Environment `production` (deployment branches: `main` only), with the
secrets `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_KNOWN_HOSTS` and
`VPS_SSH_KEY`. Failed runs are reported by GitHub's standard workflow
notifications.
