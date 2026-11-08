#!/usr/bin/env bash
# Shared by the two production rollout commands. Run as deploy, never with sudo.
set -eo pipefail
umask 077
TRANSPORT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$TRANSPORT_ROOT"
if [ "$(id -un)" != deploy ]; then
  echo 'Pokreni kao korisnik deploy (sudo -iu deploy), bez sudo ispred skripte.' >&2
  exit 1
fi
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo 'NVM nije instaliran za deploy.' >&2
  exit 1
fi
. "$NVM_DIR/nvm.sh" --no-use
nvm use "$(cat .nvmrc)"
for tool in node pm2; do command -v "$tool" >/dev/null; done
[ -f .env ] || { echo 'Nedostaje .env.' >&2; exit 1; }
[ -s .next/BUILD_ID ] || { echo 'Prvo uspješno završi npm ci i npm run build.' >&2; exit 1; }
export TRANSPORT_DEPLOY_STATE="$HOME/transport-deploy"
mkdir -p "$TRANSPORT_DEPLOY_STATE"
if ! mkdir "$TRANSPORT_DEPLOY_STATE/lock" 2>/dev/null; then
  echo "Druga deploy skripta radi ili je prethodna prekinuta. Provjeri $TRANSPORT_DEPLOY_STATE/lock prije ponavljanja." >&2
  exit 1
fi
trap 'rmdir "$TRANSPORT_DEPLOY_STATE/lock" 2>/dev/null || true' EXIT
export TRANSPORT_DEPLOY_RUN
TRANSPORT_DEPLOY_RUN=$(mktemp -d "$TRANSPORT_DEPLOY_STATE/run.XXXXXXXX")
echo "Logovi: $TRANSPORT_DEPLOY_RUN"
# Contains environment variables: private permissions, never print or share this file.
pm2 jlist > "$TRANSPORT_DEPLOY_RUN/pm2-before.json"
node scripts/deploy/helpers.cjs validate-processes
