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
cp -v "$src"/*.js "$dst/"

echo "synced $(ls -1 "$src"/*.js | wc -l) carts into $dst"
