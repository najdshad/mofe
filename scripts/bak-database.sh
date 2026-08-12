#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

DB="file:./prisma/dev.db"
DB="${DB#file:}"
DIR="${BAK_DIR:-backups}"
KEEP="${BAK_KEEP:-14}"
mkdir -p "$DIR"
OUT="$DIR/mofe-$(date +%F-%H%M%S).db"

node -e "
const Database = require('better-sqlite3');
const db = new Database(process.argv[1], { readonly: true });
db.backup(process.argv[2]).catch((e) => { console.error(e); process.exit(1); });
" "$DB" "$OUT"

ls -1t "$DIR"/mofe-*.db 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "backup written: $OUT"