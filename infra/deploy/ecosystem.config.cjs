const { readdirSync } = require('node:fs');
const { join } = require('node:path');

const REPO = '/var/www/repos/cofarm';
const NVM_NODE_DIR = '/home/cofarm/.nvm/versions/node';

// pm2's interpreter takes a path, and the system node is 20, which this app
// cannot run on. Resolve the highest nvm v22 line at load instead of pinning a
// patch version that the next `nvm install 22` would strand.
function node22() {
  const versions = readdirSync(NVM_NODE_DIR)
    .filter((name) => name.startsWith('v22.'))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const latest = versions[versions.length - 1];
  if (latest === undefined) {
    throw new Error(`No v22.* node under ${NVM_NODE_DIR}`);
  }
  return join(NVM_NODE_DIR, latest, 'bin', 'node');
}

module.exports = {
  apps: [
    {
      name: 'cofarm-api',
      cwd: `${REPO}/apps/api`,
      script: `${REPO}/node_modules/tsx/dist/cli.mjs`,
      args: '--env-file=../../.env src/main.ts',
      interpreter: node22(),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      // 8 GB across 27 sites; a leak must restart this app, not evict the others.
      max_memory_restart: '512M',
      env_file: `${REPO}/.env`,
      env: {
        NODE_ENV: 'production',
      },
      // /var/log/pm2 belongs to root and the other sites; this app owns its own.
      out_file: '/var/log/pm2/cofarm/api.out.log',
      error_file: '/var/log/pm2/cofarm/api.error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
