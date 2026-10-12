#!/usr/bin/env bash
set -euo pipefail

REPO=/var/www/repos/cofarm
APP=cofarm-api

# A non-login ssh command resolves node to the system v20, which this app cannot
# run on, and pnpm only exists under nvm's 22 via corepack. Source it first.
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null

cd "$REPO"
git fetch --prune origin main
git reset --hard origin/main

# apps/mobile's Expo tree is over a GB and production never runs it.
pnpm install --frozen-lockfile --filter '@cofarm/api...'

pnpm --filter @cofarm/api db:migrate

if pm2 describe "$APP" >/dev/null 2>&1; then
  pm2 reload "$APP" --update-env
else
  pm2 start "$REPO/infra/deploy/ecosystem.config.cjs"
fi

pm2 save
