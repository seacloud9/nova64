#!/usr/bin/env bash
# run-cart-smoke.sh — boot every ported real Nova64 cart through the headless
# conformance_runner, tick 10 frames, and report which ones load cleanly.
#
# Usage:
#   bash scripts/run-cart-smoke.sh                # all ported carts
#   bash scripts/run-cart-smoke.sh hello-world    # single cart
#
# Pass criterion: harness prints
#   [nova64] cart loaded: <res-path> init=true update=true draw=true
# and exits without a Godot crashhandler dump.
set -euo pipefail

GODOT="${GODOT:-godot}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../godot_project"

# Carts ported from examples/. Synthetic conformance carts (00-* … 10-*) are
# covered by run-conformance.sh; this script focuses on real Nova64 ports.
DEFAULT_CARTS=(
  "hello-namespaced"
  "hello-world"
  "test-2d-overlay"
  "babylon-demo"
)

CARTS=("$@")
if [ ${#CARTS[@]} -eq 0 ]; then
  CARTS=("${DEFAULT_CARTS[@]}")
fi

bash "$SCRIPT_DIR/sync-carts.sh" >/dev/null

pass=0
fail=0
for name in "${CARTS[@]}"; do
  cart="res://carts/${name}"
  out=$(
    "$GODOT" --headless --path "$PROJECT_DIR" \
      --script res://scripts/conformance_runner.gd \
      -- --cart="$cart" --frames=10 2>&1 || true
  )
  if echo "$out" | grep -q "init=true update=true draw=true"; then
    echo "PASS  $name"
    pass=$((pass + 1))
  else
    echo "FAIL  $name"
    echo "$out" | tail -10 | sed 's/^/    /'
    fail=$((fail + 1))
  fi
done

echo
echo "Cart smoke: ${pass} pass / ${fail} fail (${#CARTS[@]} total)"
[ "$fail" -eq 0 ] || exit 1
