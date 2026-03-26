#!/bin/bash
# Build OS shell and copy to main nova64 public directory

echo "🔨 Building OS shell..."
cd "$(dirname "$0")"
pnpm build

# Inject Three.js import map into built index.html (needed for dynamic runtime imports)
echo "🔗 Injecting Three.js import map..."
IMPORTMAP='    <script type="importmap">\n    {\n      "imports": {\n        "three": "https://esm.sh/three@0.182.0",\n        "three/examples/jsm/": "https://esm.sh/three@0.182.0/examples/jsm/"\n      }\n    }\n    </script>'
if ! grep -q 'importmap' dist/index.html; then
  sed -i.bak "s|<title>nova64 OS</title>|<title>nova64 OS</title>\n${IMPORTMAP}|" dist/index.html
  rm -f dist/index.html.bak
  echo "   ✅ Import map injected"
else
  echo "   ℹ️  Import map already present"
fi

echo "📦 Copying to main nova64..."
mkdir -p ../public/os9-shell
cp -r dist/* ../public/os9-shell/

# Add base href for serving from subdirectory
if ! grep -q '<base' ../public/os9-shell/index.html; then
  sed -i.bak 's|<meta charset="UTF-8" />|<meta charset="UTF-8" />\n    <base href="/os9-shell/" />|' ../public/os9-shell/index.html
  rm -f ../public/os9-shell/index.html.bak
fi

echo "✅ OS shell built and deployed to /public/os9-shell/"
echo "   Access at: http://localhost:5174/os9-shell/index.html"
