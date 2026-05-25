#!/usr/bin/env bash
# Run Alembic from backend/ using the project venv (if present).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -x .venv/bin/python ]]; then
  exec .venv/bin/python -m alembic "$@"
fi

exec python -m alembic "$@"
