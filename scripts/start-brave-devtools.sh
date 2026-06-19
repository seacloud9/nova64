#!/usr/bin/env bash
set -euo pipefail

PORT="${BRAVE_DEVTOOLS_PORT:-9222}"
BROWSER_URL="http://127.0.0.1:${PORT}"

endpoint_ready() {
  cmd.exe /c curl.exe -fsS "${BROWSER_URL}/json/version" >/dev/null 2>&1 ||
    curl -fsS "${BROWSER_URL}/json/version" >/dev/null 2>&1
}

if endpoint_ready; then
  echo "Brave DevTools endpoint already available at ${BROWSER_URL}"
  exit 0
fi

if [[ -n "${BRAVE_EXE:-}" ]]; then
  BRAVE_PATH="${BRAVE_EXE}"
elif [[ -f "/mnt/c/Users/brend/AppData/Local/BraveSoftware/Brave-Browser/Application/brave.exe" ]]; then
  BRAVE_PATH="/mnt/c/Users/brend/AppData/Local/BraveSoftware/Brave-Browser/Application/brave.exe"
elif [[ -f "/mnt/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe" ]]; then
  BRAVE_PATH="/mnt/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe"
elif [[ -f "/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe" ]]; then
  BRAVE_PATH="/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe"
else
  echo "Could not find brave.exe. Set BRAVE_EXE to the Windows Brave path." >&2
  exit 1
fi

PROFILE_DIR="${BRAVE_DEVTOOLS_PROFILE_DIR:-/mnt/c/Users/brend/AppData/Local/Temp/nova64-brave-devtools-profile}"
mkdir -p "${PROFILE_DIR}"
WINDOWS_PROFILE_DIR="$(wslpath -w "${PROFILE_DIR}")"

"${BRAVE_PATH}" \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port="${PORT}" \
  --user-data-dir="${WINDOWS_PROFILE_DIR}" \
  about:blank >/dev/null 2>&1 &

for _ in $(seq 1 40); do
  if endpoint_ready; then
    echo "Brave DevTools endpoint ready at ${BROWSER_URL}"
    exit 0
  fi
  sleep 0.25
done

echo "Brave started, but ${BROWSER_URL}/json/version did not respond yet." >&2
exit 1
