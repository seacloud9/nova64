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

# Root HTML files
echo "📄 Copying root files..."
cp "$NOVA64_DIR/index.html" "$DEPLOY_DIR/index.html"
cp "$NOVA64_DIR/console.html" "$DEPLOY_DIR/console.html"

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
