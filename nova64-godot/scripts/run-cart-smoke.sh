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
  # Auto-discover every cart under tests/carts/ that has a code.js, skipping
  # the synthetic conformance suite (00-* through 10-*) which uses a
  # separate assert harness covered by run-conformance.sh.
  CARTS_ROOT="$SCRIPT_DIR/../tests/carts"
  while IFS= read -r dir; do
    name="$(basename "$dir")"
    case "$name" in
      0[0-9]-*|10-*) continue ;;
    esac
    if [ -f "$dir/code.js" ]; then
      CARTS+=("$name")
    fi
  done < <(find "$CARTS_ROOT" -mindepth 1 -maxdepth 1 -type d | sort)
fi

bash "$SCRIPT_DIR/sync-carts.sh" >/dev/null

# Pass criteria — a cart must:
#   1. Export init/update/draw (printed as init=true update=true draw=true)
#   2. Run >=20 frames WITHOUT printing any `[nova64] cart <hook>:` errors.
#      That prefix is only emitted when JS_Call returns an exception out of
#      cart_init / cart_update / cart_draw — i.e. a real runtime error.
FRAMES="${SMOKE_FRAMES:-20}"
pass=0
fail=0
fail_names=()
for name in "${CARTS[@]}"; do
  cart="res://carts/${name}"
  out=$(
    "$GODOT" --headless --path "$PROJECT_DIR" \
      --script res://scripts/conformance_runner.gd \
      -- --cart="$cart" --frames="$FRAMES" 2>&1 || true
  )
  reason=""
  if ! echo "$out" | grep -q "init=true update=true draw=true"; then
    reason="hooks missing"
  elif echo "$out" | grep -qE "\[nova64\] cart (init|update|draw):"; then
    # Extract the first runtime error line for the report.
    reason="$(echo "$out" | grep -oE "\[nova64\] cart (init|update|draw):.*" | head -1)"
  elif echo "$out" | grep -q "CrashHandlerException"; then
    reason="native crash"
  fi

  if [ -z "$reason" ]; then
    printf 'PASS  %s\n' "$name"
    pass=$((pass + 1))
  else
    printf 'FAIL  %s  (%s)\n' "$name" "$reason"
    fail=$((fail + 1))
    fail_names+=("$name")
  fi
done

echo
echo "Cart smoke: ${pass} pass / ${fail} fail (${#CARTS[@]} total, ${FRAMES} frames each)"
if [ "$fail" -gt 0 ]; then
  echo "Failures: ${fail_names[*]}"
  exit 1
fi
