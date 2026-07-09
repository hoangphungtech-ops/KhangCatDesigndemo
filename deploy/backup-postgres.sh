#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/khangcat}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
pg_dump "$DATABASE_URL" --format=custom --file="$BACKUP_DIR/khangcat-$STAMP.dump"
find "$BACKUP_DIR" -type f -name 'khangcat-*.dump' -mtime "+$RETENTION_DAYS" -delete
echo "Backup saved: $BACKUP_DIR/khangcat-$STAMP.dump"
