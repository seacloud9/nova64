#!/usr/bin/env bash
# Editor smoke test — boots the Godot editor on the project, lets it run a
# few frames so addons load and the FileSystem scan completes, then quits
# and asserts that no known-bad error patterns appeared on stderr.
#
# Usage:
#   GODOT=/path/to/godot bash scripts/run-editor-smoke.sh
#
# Exits non-zero if any bad pattern is found, with the matching lines printed.
set -euo pipefail

GODOT_BIN="${GODOT:-godot}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
PROJECT_DIR="$ROOT/godot_project"
LOG_DIR="$ROOT/test-results"
LOG="$LOG_DIR/editor-smoke.log"

mkdir -p "$LOG_DIR"
bash "$SCRIPT_DIR/sync-carts.sh" >/dev/null

# --editor opens the editor; --quit-after N quits after N idle frames so the
# initial filesystem scan and addon _enter_tree have all run.
"$GODOT_BIN" --editor --path "$PROJECT_DIR" --quit-after 120 >"$LOG" 2>&1 || true

# Patterns we treat as smoke-test failures. Add more as we encounter them.
PATTERNS=(
	"Task 'first_scan_filesystem' already exists"
	"addon_name_to_plugin.has(addon_path)"
	"Condition \"thread.is_started()\" is true"
	"Failed to load script"
	"Parse Error:"
	"SCRIPT ERROR"
)

fail=0
echo "=== editor smoke log: $LOG ==="
for pat in "${PATTERNS[@]}"; do
	if grep -F -q -- "$pat" "$LOG"; then
		echo "BAD: matched pattern: $pat"
		grep -F -n -- "$pat" "$LOG" | head -5 | sed 's/^/  /'
		fail=1
	fi
done

if [ "$fail" -ne 0 ]; then
	echo
	echo "Editor smoke: FAIL — see $LOG"
	exit 1
fi

echo "Editor smoke: PASS"
