#!/usr/bin/env bash
# diff_commands.sh — compare two render command log files with friendly field names.
# Usage: diff_commands.sh old.commands new.commands
set -euo pipefail

if [[ $# -lt 2 ]]; then
   echo "usage: $0 <old.commands> <new.commands>" >&2
   exit 2
fi

OLD="$1"
NEW="$2"

if [[ ! -f "$OLD" ]]; then echo "file not found: $OLD" >&2; exit 1; fi
if [[ ! -f "$NEW" ]]; then echo "file not found: $NEW" >&2; exit 1; fi

# Canonicalize: sort by key for stable diffs across frame-ordering differences
canonical() {
   sort "$1"
}

TMP_OLD=$(mktemp)
TMP_NEW=$(mktemp)
canonical "$OLD" > "$TMP_OLD"
canonical "$NEW" > "$TMP_NEW"

DIFF=$(diff --unified=3 "$TMP_OLD" "$TMP_NEW" || true)
rm -f "$TMP_OLD" "$TMP_NEW"

if [[ -z "$DIFF" ]]; then
   echo "commands: identical"
   exit 0
fi

echo "commands: DIFF"
echo "$DIFF" | while IFS= read -r line; do
   # Replace raw hex colours with RGBA labels where possible
   echo "$line" | sed \
      -e 's/color=\([0-9a-fA-F]\{8\}\)/color=#\1/g' \
      -e 's/ambient=\([0-9a-fA-F]\{8\}\)/ambient=#\1/g' \
      -e 's/fog_color=\([0-9a-fA-F]\{8\}\)/fog_color=#\1/g'
done
exit 1
