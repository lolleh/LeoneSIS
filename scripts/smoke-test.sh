#!/usr/bin/env bash
# Quick end-to-end smoke test against a running LeoneSIS instance.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_PORT="$(grep -E '^APP_PORT=' .env 2>/dev/null | tail -n1 | cut -d= -f2 | tr -d '[:space:]' || true)"
URL="${LEONESIS_URL:-${SCHOOLMS_URL:-http://localhost:${APP_PORT:-8080}}}"

exec python3 scripts/manage.py --url "$URL" smoke
