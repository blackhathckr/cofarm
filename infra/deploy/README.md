# CoFarm deploy runbook

Ubuntu 22.04 at `147.93.171.87`, shared with 26 other nginx sites. System Node
is 20 and must not be touched — the API runs under nvm's Node 22. Deploys run as
the unprivileged `cofarm` user, which owns the clone at `/var/www/repos/cofarm`
and holds two passwordless sudo rights: `/usr/sbin/nginx -t` and
`/bin/systemctl reload nginx`. Admin static root is `apps/admin/dist` under the
clone, API on `127.0.0.1:4020`, pm2 app `cofarm-api`.

## First-time VM setup

As root. `cofarm.farm` is a separate live site — leave its config alone.

```
useradd -m -s /bin/bash cofarm
install -d -o cofarm -g cofarm /var/www/repos /var/log/pm2/cofarm
chmod 755 /var/www /var/www/repos
echo 'cofarm ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /bin/systemctl reload nginx' \
  > /etc/sudoers.d/cofarm-nginx
cp /var/www/repos/cofarm/infra/nginx/*.cofarm.farm.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/{api,admin}.cofarm.farm.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.cofarm.farm -d admin.cofarm.farm
```

As `cofarm`:

```
git clone <repo> /var/www/repos/cofarm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install 22 && nvm use 22
corepack enable pnpm && npm i -g pm2
```

Then `cp .env.production.example .env` in the clone and fill every
`REPLACE_ME` — the only copy of production config, and gitignored. The
`cofarm` Postgres role and database are created separately; their password
goes in that file. Run `pm2 startup`, which prints one root command so the app
survives a reboot, then `infra/deploy/api.sh` once by hand to prove the path.

## GitHub secrets

- `VM_HOST` — `147.93.171.87`
- `VM_USER` — `cofarm`
- `VM_SSH_KEY` — deploy key whose public half is in `/home/cofarm/.ssh/authorized_keys`

The workflow pins the host key with `ssh-keyscan` at run time rather than
disabling host key checking. To pin it for good, keep that output in a secret.

## Deploying by hand

API, over ssh as `cofarm`: `/var/www/repos/cofarm/infra/deploy/api.sh`

Admin, from a checkout on a workstation:

```
pnpm install --frozen-lockfile --filter "@cofarm/admin..."
pnpm --filter @cofarm/admin build
rsync -az --delete apps/admin/dist/ cofarm@147.93.171.87:/var/www/repos/cofarm/apps/admin/dist/
ssh cofarm@147.93.171.87 /var/www/repos/cofarm/infra/deploy/admin.sh
```

Both scripts are idempotent. Never run `db:seed`, `db:seed:demo`, `db:reset` or
`db:truncate` against production.

## Rolling back

API — `cd /var/www/repos/cofarm && git log --oneline -10`, then
`git reset --hard <sha> && infra/deploy/api.sh`. `api.sh` resets to
`origin/main`, so a rollback that must outlive the next deploy has to be a
revert commit on `main`. To stop serving at once: `pm2 stop cofarm-api`.
Migrations are not reversible — restore from a dump taken before the deploy.
Admin — rebuild the last good commit and rsync again; the VM keeps no copy.

## Logs

- API: `pm2 logs cofarm-api`, or `/var/log/pm2/cofarm/api.{out,error}.log`
- nginx: `/var/log/nginx/{api,admin}.cofarm.farm.{access,error}.log`
- Postgres: `journalctl -u postgresql` (needs root)
