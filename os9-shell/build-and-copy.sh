#!/bin/bash
# Build OS shell and copy to main nova64 public directory

echo "🔨 Building OS shell..."
cd "$(dirname "$0")"
pnpm build

echo "📦 Copying to main nova64..."
mkdir -p ../public/os9-shell
cp -r dist/* ../public/os9-shell/

echo "✅ OS shell built and deployed to /public/os9-shell/"
echo "   Access at: http://localhost:5174/os9-shell/index.html"
