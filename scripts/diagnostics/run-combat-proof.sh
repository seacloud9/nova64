#!/usr/bin/env bash
set -euo pipefail

source ~/.nvm/nvm.sh
nvm use 20 >/dev/null
cd /mnt/c/Users/brend/exp/nova64

pnpm exec vite --port 3017 --strictPort >/tmp/nova64-proof-vite.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  if curl -fsS http://localhost:3017 >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

node scripts/diagnostics/combat-visual-proof.mjs
