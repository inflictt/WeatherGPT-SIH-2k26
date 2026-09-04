#!/usr/bin/env bash
# Starts all three processes and stops them together on Ctrl-C.
#   ./run.sh          uses the MONGO_URI in server/.env
#   ./run.sh --nodb   uses a temporary database, nothing to install
set -uo pipefail
cd "$(dirname "$0")"

NODB=0
[ "${1:-}" = "--nodb" ] && NODB=1

blue() { printf '\033[36m%s\033[0m\n' "$1"; }

[ -d ai/.venv ] || { echo "Run ./setup.sh first."; exit 1; }
[ -d server/node_modules ] || { echo "Run ./setup.sh first."; exit 1; }

PIDS=()
cleanup() {
  echo
  blue "stopping…"
  for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null; done
  wait 2>/dev/null
  exit 0
}
trap cleanup INT TERM

blue "1/3  risk + agriculture engines  →  http://localhost:8000/docs"
(cd ai && .venv/bin/python -m uvicorn app.main:app --port 8000 --log-level warning) &
PIDS+=($!)
sleep 3

if [ "$NODB" = "1" ]; then
  blue "2/3  API (temporary database)   →  http://localhost:5050"
  (cd server && npm run dev:nodb) &
else
  blue "2/3  API                        →  http://localhost:5050"
  (cd server && npm run dev) &
fi
PIDS+=($!)
sleep 4

blue "3/3  web                         →  http://localhost:5173"
(cd client && npm run dev) &
PIDS+=($!)

echo
blue "open  http://localhost:5173     (Ctrl-C stops everything)"
wait
