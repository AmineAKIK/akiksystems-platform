#!/usr/bin/env bash
# AkikSystems production deployment. Installed as root:root 0755 at
# /usr/local/bin/akiksystems-deploy and only reachable through
#   sudo -n /usr/local/bin/akiksystems-deploy <40-hex SHA>
# from the forced SSH command (akiksystems-deploy-ssh). Never run the copy
# inside the repository: it would be supplied by the code being deployed.
#
# Usage:
#   akiksystems-deploy <sha>                  deploy a commit of origin/main
#   akiksystems-deploy --allow-older <sha>    root-only manual rollback to an
#                                             older commit of origin/main
#
# Guarantees: only the Compose project akiksystems-platform and images named
# akiksystems-web:<40-hex sha> are touched. No `compose down`, no prune, no
# volume, network or Nginx change.

# Start from an empty, known environment whatever the caller passed.
if [[ "${AKS_DEPLOY_CLEAN_ENV:-}" != 1 ]]; then
  exec /usr/bin/env -i AKS_DEPLOY_CLEAN_ENV=1 HOME=/root LC_ALL=C \
    PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    /bin/bash "$0" "$@"
fi

set -Eeuo pipefail
umask 022

readonly REPO_DIR=/var/www/akiksystems-platform
readonly REPO_URL=https://github.com/AmineAKIK/akiksystems-platform.git
readonly PROJECT=akiksystems-platform
readonly SERVICE=web
readonly IMAGE_REPO=akiksystems-web
readonly STATE_DIR=/var/lib/akiksystems-deploy
readonly CURRENT_FILE="$STATE_DIR/current-sha"
readonly LOCK_FILE=/run/lock/akiksystems-deploy.lock
readonly KEEP_IMAGES=5
readonly MIN_FREE_KB=$((10 * 1024 * 1024))
readonly MIN_FREE_PCT=15
readonly HEALTH_TIMEOUT_S=120

STARTED_AT="$(date +%s)"
readonly STARTED_AT
phase=init
target=''
previous=''

log() {
  local message="$*"
  printf '%s akiksystems-deploy: %s\n' "$(date -u +%FT%TZ)" "$message"
  logger -t akiksystems-deploy -- "$message" || true
}

die() {
  log "error: $*"
  exit 1
}

is_sha() {
  [[ "$1" =~ ^[0-9a-f]{40}$ ]]
}

compose() {
  GIT_SHA="$1" docker compose -p "$PROJECT" -f "$REPO_DIR/deploy/vps/compose.yml" "${@:2}"
}

container_id() {
  docker ps -q \
    --filter "label=com.docker.compose.project=$PROJECT" \
    --filter "label=com.docker.compose.service=$SERVICE"
}

running_sha() {
  local id image
  id="$(container_id)"
  [[ -n "$id" ]] || return 1
  image="$(docker inspect --format '{{.Config.Image}}' "$id")"
  [[ "$image" == "$IMAGE_REPO:"* ]] || return 1
  printf '%s' "${image#"$IMAGE_REPO":}"
}

http_code() {
  curl -s -o /dev/null --max-time 5 -w '%{http_code}' -H "Host: $1" "http://127.0.0.1:3100$2" || true
}

# Healthy container, on the expected image, answering on the public contract.
verify() {
  local sha="$1" deadline status id
  deadline=$(($(date +%s) + HEALTH_TIMEOUT_S))
  while :; do
    id="$(container_id)"
    status=''
    [[ -n "$id" ]] && status="$(docker inspect --format '{{.State.Health.Status}}' "$id" 2>/dev/null || true)"
    [[ "$status" == healthy ]] && break
    if (($(date +%s) >= deadline)); then
      log "healthcheck timeout after ${HEALTH_TIMEOUT_S}s (status: ${status:-missing})"
      return 1
    fi
    sleep 2
  done

  local image
  image="$(docker inspect --format '{{.Config.Image}}' "$id")"
  if [[ "$image" != "$IMAGE_REPO:$sha" ]]; then
    log "container runs $image, expected $IMAGE_REPO:$sha"
    return 1
  fi

  local host path expected code
  while read -r host path expected; do
    code="$(http_code "$host" "$path")"
    if [[ "$code" != "$expected" ]]; then
      log "check failed: Host $host $path answered $code, expected $expected"
      return 1
    fi
  done <<'CHECKS'
localhost /health 200
akiksystems.com /en 200
akiksystems.fr /fr 200
akiksystems.fr /fr/profil 200
79.137.34.84 /en 421
CHECKS
}

rollback() {
  set +e
  log "rollback: restoring $previous"

  if ! git -C "$REPO_DIR" checkout --quiet --detach "$previous"; then
    log "rollback FAILED: cannot restore checkout $previous"
    return 1
  fi

  if compose "$previous" up -d --no-build --no-deps "$SERVICE" && verify "$previous"; then
    log "rollback: $previous is serving again"
    return 0
  fi

  log "rollback FAILED: production needs manual intervention"
  return 1
}

on_exit() {
  local code=$?
  local duration=$(($(date +%s) - STARTED_AT))
  case "$phase" in
    'done')
      log "result: success sha=$target previous=$previous duration=${duration}s"
      ;;
    switched)
      log "result: failed after switch sha=$target"
      if rollback; then
        log "result: rolled back to $previous duration=${duration}s"
      else
        log "result: rollback failed, production needs manual intervention duration=${duration}s"
      fi
      ;;
    checked-out)
      set +e
      if git -C "$REPO_DIR" checkout --quiet --detach "$previous"; then
        log "result: failed before switch, production untouched (still $previous) duration=${duration}s"
      else
        log "result: failed before switch, production untouched but checkout could not be restored to $previous duration=${duration}s"
      fi
      ;;
    skipped) ;;
    *)
      ((code == 0)) || log "result: failed before any change duration=${duration}s"
      ;;
  esac
}
trap on_exit EXIT

# 1. Arguments.
allow_older=false
if [[ "${1:-}" == --allow-older ]]; then
  allow_older=true
  shift
fi
[[ $# -eq 1 ]] || die 'usage: akiksystems-deploy [--allow-older] <40-hex sha>'
is_sha "$1" || die 'the commit must be a full 40-character lowercase SHA'
target="$1"
[[ "$(id -u)" -eq 0 ]] || die 'must run as root'

# 2. One deployment at a time.
exec 9>"$LOCK_FILE"
flock -n 9 || die 'another deployment is already running'

log "requested sha=$target"

# 3. Disk space where Docker stores images.
docker_root="$(docker info --format '{{.DockerRootDir}}')"
read -r free_kb used_pct < <(df -Pk "$docker_root" | awk 'NR == 2 { gsub("%", "", $5); print $4, $5 }')
((free_kb >= MIN_FREE_KB)) || die "only $((free_kb / 1024 / 1024)) GiB free on $docker_root (minimum 10)"
((100 - used_pct >= MIN_FREE_PCT)) || die "only $((100 - used_pct))% free on $docker_root (minimum $MIN_FREE_PCT%)"

# 4. Checkout sanity.
cd "$REPO_DIR"
[[ "$(git remote get-url origin)" == "$REPO_URL" ]] || die "unexpected origin $(git remote get-url origin)"
[[ -z "$(git status --porcelain)" ]] || die "$REPO_DIR has local changes"

# 5. Production SHA before this deployment.
install -d -m 0755 "$STATE_DIR"
if [[ -f "$CURRENT_FILE" ]]; then
  previous="$(<"$CURRENT_FILE")"
else
  previous="$(running_sha)" || die "cannot read the running $IMAGE_REPO image to initialise $CURRENT_FILE"
  is_sha "$previous" || die "running image tag is not a full SHA: $previous"
  printf '%s\n' "$previous" >"$CURRENT_FILE.tmp" && mv -f "$CURRENT_FILE.tmp" "$CURRENT_FILE"
  log "initialised $CURRENT_FILE with running sha=$previous"
fi
is_sha "$previous" || die "$CURRENT_FILE does not contain a full SHA"
log "previous sha=$previous"

# 6. The commit must belong to origin/main.
git fetch --quiet --prune origin '+refs/heads/main:refs/remotes/origin/main'
git cat-file -e "$target^{commit}" 2>/dev/null || die "commit $target does not exist on origin"
git merge-base --is-ancestor "$target" refs/remotes/origin/main || die "commit $target is not on origin/main"

if [[ "$target" == "$previous" ]] && [[ "$(running_sha || true)" == "$target" ]] && verify "$target"; then
  phase=skipped
  log "result: $target is already in production, nothing to do"
  exit 0
fi

# A late CI run must never downgrade production; manual rollbacks say so explicitly.
if [[ "$target" != "$previous" ]] && git merge-base --is-ancestor "$target" "$previous" && ! $allow_older; then
  phase=skipped
  log "result: skipped, $target is older than production $previous"
  exit 0
fi

# 7. Build the candidate from the exact commit.
phase=checked-out
git checkout --quiet --detach "$target"
[[ "$(git rev-parse HEAD)" == "$target" ]] || die 'checkout does not match the requested SHA'
log "build: start"
compose "$target" build --pull "$SERVICE"
revision="$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$IMAGE_REPO:$target")"
[[ "$revision" == "$target" ]] || die "image revision label is '$revision'"
log "build: done"

# 8. Replace the container (short interruption), then verify.
log "switch: start"
phase=switched
compose "$target" up -d --no-build --no-deps "$SERVICE"
log "healthcheck: start"
verify "$target"
log "healthcheck: passed"

printf '%s\n' "$target" >"$CURRENT_FILE.tmp"
mv -f "$CURRENT_FILE.tmp" "$CURRENT_FILE"
phase='done'

# 9. Keep the newest images plus current and previous; remove only exact akiksystems-web:<sha> tags.
kept=0
while read -r tag; do
  is_sha "$tag" || continue
  if [[ "$tag" == "$target" || "$tag" == "$previous" ]] || ((kept < KEEP_IMAGES)); then
    kept=$((kept + 1))
    continue
  fi
  if docker image rm "$IMAGE_REPO:$tag" >/dev/null 2>&1; then
    log "cleanup: removed $IMAGE_REPO:$tag"
  fi
done < <(docker image ls "$IMAGE_REPO" --format '{{.Tag}}')
