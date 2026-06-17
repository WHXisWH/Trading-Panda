#!/usr/bin/env bash
# Install Sui CLI testnet build (protocol 126+) via suiup or direct download.
set -euo pipefail

ARCH="$(uname -m)"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
TAG="testnet-v1.73.1"
FILE="sui-${TAG}-${OS}-${ARCH}.tgz"
URL="https://github.com/MystenLabs/sui/releases/download/${TAG}/${FILE}"
DEST="${HOME}/.local/bin/sui-testnet"

echo "Target: ${URL}"

if command -v suiup >/dev/null 2>&1; then
  echo "Trying suiup install sui@testnet ..."
  if suiup install sui@testnet; then
    SUI_PATH="$(suiup which sui@testnet 2>/dev/null || true)"
    if [[ -n "${SUI_PATH}" ]]; then
      echo "Installed: ${SUI_PATH}"
      "${SUI_PATH}" --version
      exit 0
    fi
  fi
fi

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT
echo "Downloading to ${TMP}/${FILE} ..."
curl -L --fail --retry 5 --retry-delay 5 -o "${TMP}/${FILE}" "${URL}"
tar -xzf "${TMP}/${FILE}" -C "${TMP}"
install -m 755 "${TMP}/sui" "${DEST}"
echo "Installed ${DEST}"
"${DEST}" --version
echo "Run upgrade with: SUI_BIN=${DEST} ./scripts/upgrade-testnet.sh"
