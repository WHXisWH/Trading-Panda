#!/usr/bin/env bash
# Upgrade TradingPanda package on Sui Testnet (single transaction).
# Requires: sui CLI with testnet protocol >= 126 (testnet-v1.73.1+).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGE_ID="0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465"
UPGRADE_CAP="0x40d481fc083c49ea5d1f48d25a60096ec07a49197370e9efe7a1cda3cd8e381e"
GAS_BUDGET="${GAS_BUDGET:-500000000}"

pick_sui() {
  if [[ -n "${SUI_BIN:-}" && -x "${SUI_BIN}" ]]; then
    echo "${SUI_BIN}"
    return
  fi
  if command -v suiup >/dev/null 2>&1; then
    local candidate
    candidate="$(suiup which sui@testnet 2>/dev/null || true)"
    if [[ -n "${candidate}" && -x "${candidate}" ]]; then
      echo "${candidate}"
      return
    fi
  fi
  if [[ -x /opt/homebrew/bin/sui ]]; then
    echo /opt/homebrew/bin/sui
    return
  fi
  command -v sui
}

SUI="$(pick_sui)"
echo "Using sui: ${SUI}"
"${SUI}" --version
echo "Active env: $("${SUI}" client active-env)"
echo "Active address: $("${SUI}" client active-address)"

cd "${ROOT}"
echo "Running package upgrade..."
UPGRADE_JSON="$("${SUI}" client upgrade --upgrade-capability "${UPGRADE_CAP}" --gas-budget "${GAS_BUDGET}" --json 2>/dev/null || true)"
if [[ -z "${UPGRADE_JSON}" ]]; then
  "${SUI}" client upgrade --upgrade-capability "${UPGRADE_CAP}" --gas-budget "${GAS_BUDGET}"
  exit 0
fi

echo "${UPGRADE_JSON}" | python3 - <<'PY'
import json, sys
raw = sys.stdin.read().strip()
if not raw:
    sys.exit(0)
data = json.loads(raw)
digest = data.get("digest") or data.get("effects", {}).get("transactionDigest")
print("Upgrade digest:", digest)
for change in data.get("objectChanges", []) or []:
    t = change.get("type")
    oid = change.get("objectId")
    otype = change.get("objectType", "")
    if t == "created" and oid:
        print(f"CREATED {oid} {otype}")
PY

echo "Verify modules:"
curl -s -X POST https://fullnode.testnet.sui.io:443 \
  -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"sui_getNormalizedMoveModulesByPackage\",\"params\":[\"${PACKAGE_ID}\"]}" \
  | python3 -c "import json,sys; m=sorted(json.load(sys.stdin).get('result',{}).keys()); print(len(m),'modules'); [print(' -',x) for x in m]"
