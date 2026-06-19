#!/usr/bin/env bash
# Deploy WebSocket Hub to Cloudflare Workers.
# Requires: wrangler login (or CLOUDFLARE_API_TOKEN) + websocket/.dev.vars
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "Not logged in to Cloudflare. Run: npx wrangler login"
  exit 1
fi

if [[ ! -f .dev.vars ]]; then
  echo "Missing .dev.vars — copy from .dev.vars.example and fill secrets."
  exit 1
fi

# shellcheck disable=SC1091
source .dev.vars

for key in JWT_SECRET UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing $key in .dev.vars"
    exit 1
  fi
done

echo "Setting Workers secrets..."
printf '%s' "$JWT_SECRET" | npx wrangler secret put JWT_SECRET --env=""
printf '%s' "$UPSTASH_REDIS_REST_URL" | npx wrangler secret put UPSTASH_REDIS_REST_URL --env=""
printf '%s' "$UPSTASH_REDIS_REST_TOKEN" | npx wrangler secret put UPSTASH_REDIS_REST_TOKEN --env=""

echo "Deploying trading-panda-ws..."
npx wrangler deploy --env=""

echo ""
echo "Deployed. Health:"
curl -sS --max-time 10 "https://trading-panda-ws.502488946.workers.dev/health" || echo "(curl skipped or timed out)"
echo ""
echo "Set frontend NEXT_PUBLIC_WS_URL=wss://trading-panda-ws.502488946.workers.dev/ws"
