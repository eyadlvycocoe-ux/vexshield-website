#!/usr/bin/env bash
# One-command deploy for the AirCore dashboard.
# Run on the server from ~/website:
#   bash deploy-website.sh
#
# It builds the site, syncs the static files to the nginx web root, and
# restarts the backend (pm2). No need to type the build/rsync/pm2 steps by hand.
set -euo pipefail

WEB_ROOT="${WEB_ROOT:-/var/www/aircore.xyz}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Building (npm run build)"
npm run build

# Sanity check: make sure the build actually produced an entry bundle.
if [ ! -f dist/index.html ] || ! ls dist/assets/e-*.js >/dev/null 2>&1; then
  echo "ERROR: build output looks incomplete (missing dist/index.html or entry bundle)."
  exit 1
fi

echo "==> Syncing to ${WEB_ROOT}"
sudo rsync -a --delete dist/ "${WEB_ROOT}/"
sudo chown -R www-data:www-data "${WEB_ROOT}" 2>/dev/null || true

echo "==> Restarting backend (pm2)"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart all
else
  echo "    pm2 not found, skipping backend restart."
fi

echo "==> Done. Hard-refresh the browser (Ctrl+Shift+R)."
