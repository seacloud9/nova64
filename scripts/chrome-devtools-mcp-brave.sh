#!/usr/bin/env bash
set -euo pipefail

WINDOWS_WRAPPER='C:\Users\brend\exp\nova64\scripts\chrome-devtools-mcp-brave.cmd'

if command -v cmd.exe >/dev/null 2>&1; then
  exec cmd.exe /c "${WINDOWS_WRAPPER}" "$@"
fi

if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  source "${HOME}/.nvm/nvm.sh"
  nvm use 20 >/dev/null 2>&1 || true
fi

exec npx -y chrome-devtools-mcp@latest \
  --browser-url="${BRAVE_DEVTOOLS_BROWSER_URL:-http://127.0.0.1:9222}" \
  --no-usage-statistics \
  --no-performance-crux \
  "$@"
