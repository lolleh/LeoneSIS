#!/usr/bin/env bash
# Build and start LeoneSIS with Docker Compose, then wait until it is healthy.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but was not found on PATH." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required (docker compose)." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

# APP_PORT may be customised in .env.
APP_PORT="$(grep -E '^APP_PORT=' .env 2>/dev/null | tail -n1 | cut -d= -f2 | tr -d '[:space:]' || true)"
APP_PORT="${APP_PORT:-8080}"

echo "Building and starting containers…"
docker compose up --build -d

echo "Waiting for LeoneSIS to become healthy on http://localhost:${APP_PORT} …"
for _ in $(seq 1 90); do
  if curl -fsS "http://localhost:${APP_PORT}/api/health" >/dev/null 2>&1; then
    echo
    echo "LeoneSIS is running."
    echo "  URL:      http://localhost:${APP_PORT}"
    echo "  Admin:    vlolleh / password"
    echo "  Demo:     greenwoodadmin / teacher1 / librarian / parent1 / student1 (password)"
    echo
    echo "Run ./scripts/smoke-test.sh to exercise the main flows."
    exit 0
  fi
  sleep 2
done

echo
echo "The stack did not become healthy in time. Showing recent logs:" >&2
docker compose logs --tail=120 app >&2 || true
exit 1
