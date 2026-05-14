#!/bin/bash
# Package a single conformance cart and run it
# Usage: pkg_and_run.sh <case-name> <js-path>
CASE="$1"
JS="$2"
PKG="/tmp/${CASE}.nova"

python3 - <<'PYEOF'
import sys, zipfile
case = sys.argv[1]; js = sys.argv[2]; pkg = sys.argv[3]
with zipfile.ZipFile(pkg, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(js, 'code.js')
PYEOF
python3 -c "
import sys, zipfile
case, js, pkg = '$CASE', '$JS', '$PKG'
with zipfile.ZipFile(pkg, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(js, 'code.js')
print('packaged', pkg)
"

echo "=== Running $CASE ==="
timeout 15 retroarch/build/harness "$PKG" 2>&1
echo "exit=$?"
