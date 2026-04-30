#!/usr/bin/env bash
# Render snapshot harness — boots each visual cart headless and writes a PNG
# to nova64-godot/test-results/snapshots/<cart>.png. Diff against baselines
# in nova64-godot/tests/snapshots/<cart>.png if present.
#
# Usage:
#   GODOT=/path/to/godot bash scripts/run-visual.sh           # default 60 frames
#   GODOT=... bash scripts/run-visual.sh --update             # refresh baselines
set -euo pipefail

GODOT_BIN="${GODOT:-godot}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
PROJECT_DIR="$ROOT/godot_project"
OUT_DIR="$ROOT/test-results/snapshots"
BASE_DIR="$ROOT/tests/snapshots"

VISUAL_CARTS=(
	"01-cube"
	"03-texture"
	"04-instances"
	"05-particles"
)

UPDATE=0
[ "${1:-}" = "--update" ] && UPDATE=1

mkdir -p "$OUT_DIR" "$BASE_DIR"
bash "$SCRIPT_DIR/sync-carts.sh" >/dev/null

fail=0
for cart in "${VISUAL_CARTS[@]}"; do
	out="$OUT_DIR/$cart.png"
	echo "=== $cart -> $out ==="
	# NOTE: no --headless: the dummy display server has no renderer so
	# viewport.get_texture() returns null. Run windowed; the script quit()s
	# itself after capturing the snapshot.
	"$GODOT_BIN" --path "$PROJECT_DIR" \
		--script res://scripts/conformance_runner.gd \
		-- "--cart=res://carts/$cart" --frames=60 "--snapshot=$out" || {
			echo "  runner failed"
			fail=1
			continue
		}

	if [ ! -f "$out" ]; then
		echo "  no snapshot produced"
		fail=1
		continue
	fi

	base="$BASE_DIR/$cart.png"
	if [ "$UPDATE" -eq 1 ] || [ ! -f "$base" ]; then
		cp -f "$out" "$base"
		echo "  baseline ${UPDATE:+updated}${UPDATE:-created}: $base"
		continue
	fi

	# Byte-equal first; full image diff is future work.
	if cmp -s "$out" "$base"; then
		echo "  match (byte-equal)"
	else
		# Compare via filesize delta as a coarse sanity check until we wire a
		# real perceptual diff. PNGs that change radically will differ in
		# size by more than 5%.
		out_sz=$(stat -c %s "$out")
		base_sz=$(stat -c %s "$base")
		delta=$(( out_sz > base_sz ? out_sz - base_sz : base_sz - out_sz ))
		threshold=$(( base_sz / 20 ))
		if [ "$delta" -le "$threshold" ]; then
			echo "  close (size delta ${delta}B / threshold ${threshold}B)"
		else
			echo "  DIFF: out=${out_sz}B base=${base_sz}B delta=${delta}B"
			fail=1
		fi
	fi
done

if [ "$fail" -ne 0 ]; then
	echo
	echo "Visual: FAIL — see $OUT_DIR"
	exit 1
fi
echo
echo "Visual: PASS"
