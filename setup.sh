#!/usr/bin/env bash
# One-time setup. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"

blue() { printf '\033[36m%s\033[0m\n' "$1"; }
warn() { printf '\033[33m%s\033[0m\n' "$1"; }
ok()   { printf '\033[32m  ✓ %s\033[0m\n' "$1"; }

blue "WeatherGPT — Farmer's Friend · setup"
echo

# --- versions -------------------------------------------------------------
command -v node >/dev/null || { warn "Node 18+ is required. https://nodejs.org"; exit 1; }
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 18 ] || { warn "Node 18+ required; found $(node -v)"; exit 1; }
ok "node $(node -v)"

PY=""
for c in python3.12 python3.11 python3.10 python3; do
  if command -v "$c" >/dev/null 2>&1; then PY="$c"; break; fi
done
[ -n "$PY" ] || { warn "Python 3.10+ is required. https://python.org"; exit 1; }
ok "python $($PY -V 2>&1 | cut -d' ' -f2)"

# --- server env -----------------------------------------------------------
# Secrets are generated here, on your machine. Nothing ships with a key in it.
if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')
  # BSD sed (macOS) needs the empty -i argument; GNU sed does not.
  if sed --version >/dev/null 2>&1; then SEDI=(-i); else SEDI=(-i ''); fi
  sed "${SEDI[@]}" "s|^JWT_SECRET=.*|JWT_SECRET=$SECRET|" server/.env
  sed "${SEDI[@]}" "s|^MONGO_URI=.*|MONGO_URI=mongodb://127.0.0.1:27017/weathergpt|" server/.env
  ok "server/.env created, JWT_SECRET generated"
else
  ok "server/.env already exists — left alone"
fi

if [ ! -f client/.env ]; then
  printf 'VITE_API_URL=http://localhost:5050\n' > client/.env
  ok "client/.env created"
else
  ok "client/.env already exists — left alone"
fi

# --- dependencies ---------------------------------------------------------
echo; blue "installing dependencies (a few minutes the first time)"
(cd server && npm install --no-audit --no-fund --silent) && ok "server"
(cd client && npm install --no-audit --no-fund --silent) && ok "client"

if [ ! -d ai/.venv ]; then
  "$PY" -m venv ai/.venv
fi
ai/.venv/bin/python -m pip install -q --upgrade pip
ai/.venv/bin/python -m pip install -q -r ai/requirements.txt
ok "ai (virtualenv at ai/.venv)"

# --- build the client -----------------------------------------------------
echo; blue "building the frontend"
(cd client && npm run build --silent >/dev/null) && ok "client/dist"
(cd client && npm run build:standalone --silent >/dev/null) && ok "client/dist-standalone/index.html (one file, no server)"

# --- database -------------------------------------------------------------
echo
if command -v mongod >/dev/null 2>&1 || (exec 3<>/dev/tcp/127.0.0.1/27017) 2>/dev/null; then
  ok "MongoDB found"
  echo
  blue "next:  ./run.sh"
else
  warn "  MongoDB is not installed."
  echo   "  You do not need it to try the project:"
  echo   "      ./run.sh --nodb     starts a temporary database, nothing to install"
  echo
  echo   "  For a database that survives a restart:"
  echo   "      brew install mongodb-community && brew services start mongodb-community"
  echo
  blue "next:  ./run.sh --nodb"
fi
