# AkikSystems VPS deployment

Production is one web container built from an exact Git commit, published on
`127.0.0.1:3100` and served publicly by Nginx on the OVHcloud VPS for
`akiksystems.com`, `www.akiksystems.com`, `akiksystems.fr` and
`www.akiksystems.fr`. The application is code-only: no database, migration,
worker or volume.

| File                 | Role                                                    |
| -------------------- | ------------------------------------------------------- |
| `compose.yml`        | Build and run the hardened web container.               |
| `nginx.conf.example` | Reference vhost: HTTPS, `www` redirects, proxy to 3100. |

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

Repeat steps 1 to 4 with the new SHA, then `up -d --no-build web` replaces the
container on port 3100 with the new image. Earlier images stay tagged
`akiksystems-web:<sha>`, so returning to a previous release is:

```sh
GIT_SHA=<previous full SHA> docker compose -f deploy/vps/compose.yml up -d --no-build web
```
