#!/usr/bin/env bash
# Run the Nova64 Godot conformance harness across all assertion carts.
# Requires: godot 4.4+ on PATH (or set GODOT env var).
set -euo pipefail

GODOT="${GODOT:-godot}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../godot_project"

# Carts that publish __nova64_assert results.
CARTS=(
	"res://carts/09-errors.js"
)

bash "$SCRIPT_DIR/sync-carts.sh" >/dev/null

fail=0
for cart in "${CARTS[@]}"; do
	echo "=== $cart ==="
	if ! "$GODOT" --headless --path "$PROJECT_DIR" \
		--script res://scripts/conformance_runner.gd \
		-- --cart="$cart" --frames=5; then
		fail=1
	fi
	echo
done

if [ "$fail" -ne 0 ]; then
	echo "Conformance: FAIL"
	exit 1
fi
echo "Conformance: PASS"
