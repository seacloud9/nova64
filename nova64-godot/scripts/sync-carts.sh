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
# Carts are folders containing code.js + meta.json. Mirror cart sources from
# $src into $dst while preserving Godot-generated *.import sidecars (which
# are tracked in git and would otherwise churn on every sync).

# 1. Drop any cart subdir in $dst whose name no longer exists in $src.
for existing in "$dst"/*/; do
  [ -d "$existing" ] || continue
  name="$(basename "$existing")"
  if [ ! -d "$src/$name" ]; then
    rm -rf "$existing"
  fi
done

# 2. For each source cart, refresh code/data files in place (preserving
#    *.import sidecars Godot wrote next to them).
for cart in "$src"/*/; do
  name="$(basename "$cart")"
  target="$dst/$name"
  mkdir -p "$target"
  # Remove only non-.import files so .import sidecars survive.
  find "$target" -mindepth 1 -maxdepth 1 ! -name '*.import' -exec rm -rf {} +
  # Copy fresh source contents in.
  cp -a "$cart"/. "$target/"
  echo "synced $name"
done

echo "synced $(ls -1d "$src"/*/ | wc -l) carts into $dst"
