#!/usr/bin/env bash
# sync-carts.sh — copy test carts from nova64-godot/tests/carts/ into
# nova64-godot/godot_project/carts/ so Godot can resolve them via res://.
#
# The canonical sources live under tests/carts/ so they can be picked up by
# the future Node-side conformance harness (see GODOT.md G3). Until that
# harness can mount the same files via res:// directly, this script keeps
# the two trees identical.

set -euo pipefail

cd "$(dirname "$0")/.."

src="tests/carts"
dst="godot_project/carts"

if [ ! -d "$src" ]; then
  echo "missing source dir: $src" >&2
  exit 1
fi

mkdir -p "$dst"
# Carts are folders containing code.js + meta.json. Mirror with rsync-style
# behavior using cp -a; nuke the destination first so deletes propagate.
rm -rf "$dst"
mkdir -p "$dst"
for cart in "$src"/*/; do
  name="$(basename "$cart")"
  cp -a "$cart" "$dst/$name"
  echo "synced $name"
done

echo "synced $(ls -1d "$src"/*/ | wc -l) carts into $dst"
