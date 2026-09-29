#!/bin/sh
# Forced command for the akiksystems-deploy SSH key. Installed as root:root 0755
# at /usr/local/bin/akiksystems-deploy-ssh. The only accepted request is
#   deploy <40-character lowercase SHA>
# which is handed to the root deployment script through a single sudo rule.

set -eu
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH

request="${SSH_ORIGINAL_COMMAND-}"

case "$request" in
  'deploy '*) sha="${request#deploy }" ;;
  *)
    echo 'refused: expected "deploy <sha>"' >&2
    exit 64
    ;;
esac

# Exactly 40 characters, all in [0-9a-f] (no newline, space or glob can pass).
case "$sha" in
  '' | *[!0-9a-f]*)
    echo 'refused: invalid SHA' >&2
    exit 64
    ;;
esac
if [ "${#sha}" -ne 40 ]; then
  echo 'refused: invalid SHA' >&2
  exit 64
fi

logger -t akiksystems-deploy -- "ssh request sha=$sha" || true
exec sudo -n /usr/local/bin/akiksystems-deploy "$sha"
