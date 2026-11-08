#!/usr/bin/env bash
export TRANSPORT_ALLOW_MISSING_PROCESSES=1
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
command -v curl >/dev/null
node scripts/deploy/helpers.cjs prepare-start
# Snapshot and config have already been validated before removing the old definitions.
while IFS= read -r process_name; do
  [ -n "$process_name" ] || continue
  pm2 stop "$process_name"
  pm2 delete "$process_name"
done < <(node scripts/deploy/helpers.cjs existing-processes)
pm2 start "$TRANSPORT_DEPLOY_RUN/runtime.config.js" --only transport-app

echo 'Čekam login stranicu na portu 3000...'
ready=false
for attempt in {1..30}; do
  if curl --fail --silent --show-error --connect-timeout 2 --max-time 5 \
    http://127.0.0.1:3000/login -o /dev/null 2>"$TRANSPORT_DEPLOY_RUN/http-check.log"; then
    ready=true
    break
  fi
  sleep 2
done
if [ "$ready" != true ]; then
  echo 'Aplikacija ne odgovara. Cron nije pokrenut. Provjeri: pm2 logs transport-app --lines 50 --nostream' >&2
  exit 1
fi

echo 'Pokrećem cron. Nakon 07:00 može odmah poslati današnji izvještaj ili RIO upozorenje.'
pm2 start "$TRANSPORT_DEPLOY_RUN/runtime.config.js" --only transport-cron
sleep 5
pm2 jlist > "$TRANSPORT_DEPLOY_RUN/pm2-after.json"
if ! node scripts/deploy/helpers.cjs verify-start; then
  pm2 stop transport-cron
  exit 1
fi
pm2 save
pm2 list
pm2 logs transport-app --lines 20 --nostream
pm2 logs transport-cron --lines 30 --nostream
if command -v systemctl >/dev/null && systemctl is-enabled pm2-deploy; then
  echo 'PM2 startup servis je omogućen; sačuvane su eksplicitne Node putanje.'
else
  echo 'Provjeri automatsko pokretanje PM2 nakon restarta VPS-a: pm2 startup'
fi
echo 'Procesi su pokrenuti. Provjeri prijavu, Schengen ekran i mapu u aplikaciji.'
