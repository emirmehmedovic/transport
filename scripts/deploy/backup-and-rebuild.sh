#!/usr/bin/env bash
# Requires a successful build and the user's reviewed preview. Does not send mail.
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
command -v pg_dump >/dev/null
command -v pg_restore >/dev/null
# Invalidate prior completion before stopping or modifying anything.
rm -f "$TRANSPORT_DEPLOY_STATE/rebuild-complete.json"
pm2 stop transport-cron
pm2 stop transport-app
node --env-file=.env scripts/deploy/helpers.cjs backup

echo 'Backup završen. Preračun može potrajati; svaki red predstavlja jednog vozača.'
node --env-file=.env --import tsx scripts/rebuild-schengen.ts --apply \
  | tee "$TRANSPORT_DEPLOY_RUN/schengen-apply.jsonl"
node scripts/deploy/helpers.cjs complete

echo 'Preračun uspješno završen. Aplikacija i cron ostaju zaustavljeni.'
echo 'Sljedeće: bash scripts/deploy/start-production.sh'
