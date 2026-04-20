#!/usr/bin/env bash
set -euo pipefail

# Deploy Nova64 to starcade9.github.io for GitHub Pages
NOVA64_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="$NOVA64_DIR/../starcade9/starcade9.github.io"

if [ ! -d "$DEPLOY_DIR/.git" ]; then
  echo "ERROR: Deploy target not found at $DEPLOY_DIR"
  echo "Expected a git repo at ../starcade9/starcade9.github.io relative to nova64"
  exit 1
fi

echo "🚀 Deploying Nova64 → starcade9.github.io"
echo "   Source: $NOVA64_DIR"
echo "   Target: $DEPLOY_DIR"
echo ""

# Build os9-shell first to ensure fresh assets in public/os9-shell/
echo "🏗️  Building os9-shell..."
(cd "$NOVA64_DIR/os9-shell" && pnpm install && pnpm build)
rm -rf "$NOVA64_DIR/public/os9-shell/"*
mkdir -p "$NOVA64_DIR/public/os9-shell"
cp -r "$NOVA64_DIR/os9-shell/dist/"* "$NOVA64_DIR/public/os9-shell/"
echo ""

# Build main Nova64 project so console.html / cart-runner.html have Three.js
# bundled locally — no esm.sh CDN needed at runtime.
echo "⚡ Building Nova64 main project (bundles Three.js for production)..."
(cd "$NOVA64_DIR" && pnpm build)
echo ""

# Ensure GitHub Pages serves static files without Jekyll processing
touch "$DEPLOY_DIR/.nojekyll"

# Root HTML files — use Vite-built versions so Three.js is bundled, not CDN-fetched
echo "📄 Copying root files..."
cp "$NOVA64_DIR/index.html" "$DEPLOY_DIR/index.html"
cp "$NOVA64_DIR/dist/console.html" "$DEPLOY_DIR/console.html"
cp "$NOVA64_DIR/dist/cart-runner.html" "$DEPLOY_DIR/cart-runner.html"
cp "$NOVA64_DIR/dist/hero-embed.html" "$DEPLOY_DIR/hero-embed.html"

# src/main.js (entry point)
echo "📦 Copying src/main.js..."
mkdir -p "$DEPLOY_DIR/src"
cp "$NOVA64_DIR/src/main.js" "$DEPLOY_DIR/src/main.js"

# Runtime (sync all .js, .d.ts, subdirs)
echo "⚙️  Syncing runtime/..."
rsync -a --delete --exclude='.DS_Store' "$NOVA64_DIR/runtime/" "$DEPLOY_DIR/runtime/"

# Examples (sync all)
echo "🎮 Syncing examples/..."
rsync -a --delete --exclude='.DS_Store' "$NOVA64_DIR/examples/" "$DEPLOY_DIR/examples/"

# Docs
echo "📚 Syncing docs/..."
rsync -a --delete --exclude='.DS_Store' "$NOVA64_DIR/docs/" "$DEPLOY_DIR/docs/"

# Public assets (sky textures etc) → assets/
echo "🎨 Syncing assets/..."
mkdir -p "$DEPLOY_DIR/assets"
rsync -a --delete --exclude='.DS_Store' "$NOVA64_DIR/public/assets/" "$DEPLOY_DIR/assets/"
# Bundled JS from dist/assets/ (Three.js + runtime — no CDN dependency)
# Added AFTER the --delete sync so these bundles are not removed.
rsync -a --exclude='.DS_Store' "$NOVA64_DIR/dist/assets/" "$DEPLOY_DIR/assets/"

# i18n locale files (es.json, ja.json)
echo "🌐 Syncing i18n/..."
mkdir -p "$DEPLOY_DIR/i18n"
rsync -a --delete --exclude='.DS_Store' "$NOVA64_DIR/dist/i18n/" "$DEPLOY_DIR/i18n/"

# OS9 shell (pre-built)
echo "🖥️  Syncing os9-shell/..."
mkdir -p "$DEPLOY_DIR/os9-shell"
rsync -a --delete --exclude='.DS_Store' "$NOVA64_DIR/public/os9-shell/" "$DEPLOY_DIR/os9-shell/"

echo ""
echo "✅ Deploy complete!"
echo ""
echo "To verify locally:"
echo "  cd $DEPLOY_DIR && npx serve ."
echo ""
echo "To push to GitHub Pages:"
echo "  cd $DEPLOY_DIR && git add -A && git commit -m 'Deploy Nova64' && git push"
