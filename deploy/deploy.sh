#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/khangcat"
SERVER_DIR="$APP_DIR/server"
DEPLOY_DIR="$APP_DIR/deploy"

if [[ ! -f "$SERVER_DIR/.env" ]]; then
  echo "Thiếu $SERVER_DIR/.env. Sao chép từ .env.example và điền secrets trước."
  exit 1
fi

mkdir -p /var/log/khangcat
cd "$SERVER_DIR"
npm ci --omit=dev
node --check server.js

pm2 startOrReload "$DEPLOY_DIR/ecosystem.config.cjs" --update-env
pm2 save

sudo nginx -t
sudo systemctl reload nginx

sleep 2
curl --fail --silent http://127.0.0.1:3000/api/health
echo
echo "KHANGCAT deployment completed."
