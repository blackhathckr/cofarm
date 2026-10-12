#!/usr/bin/env bash
set -euo pipefail

DIST=/var/www/repos/cofarm/apps/admin/dist

if [ ! -d "$DIST" ]; then
  echo "admin: $DIST does not exist; nothing was shipped" >&2
  exit 1
fi

if [ ! -f "$DIST/index.html" ] || [ -z "$(ls -A "$DIST")" ]; then
  echo "admin: $DIST holds no index.html; refusing to publish an empty build" >&2
  exit 1
fi

# nginx reads these as www-data and the deploy user cannot chown, so world-read
# is the only way to hand the bundle over.
find "$DIST" -type d -exec chmod 755 {} +
find "$DIST" -type f -exec chmod 644 {} +

# 26 other live sites share this nginx, so a bad config must never reach a
# reload. These two are the deploy user's only passwordless sudo rights.
sudo /usr/sbin/nginx -t && sudo /bin/systemctl reload nginx
