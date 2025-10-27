#!/bin/bash
# Nova64 Documentation Validation Script

echo "🔍 Validating Nova64 Documentation System..."
echo ""

DOCS_DIR="/Users/brendonsmith/exp/nova64/docs"
ERRORS=0

# List of expected documentation files
EXPECTED_FILES=(
    "index.html"
    "api.html"
    "api-3d.html"
    "api-sprites.html"
    "api-skybox.html"
    "api-effects.html"
    "api-voxel.html"
    "input.html"
    "ui.html"
    "audio.html"
    "physics.html"
    "collision.html"
    "storage.html"
    "screens.html"
    "textinput.html"
    "editor.html"
    "fullscreen-button.html"
    "console.html"
    "framebuffer.html"
    "font.html"
    "assets.html"
    "gpu-systems.html"
)

echo "📁 Checking for all expected files..."
for file in "${EXPECTED_FILES[@]}"; do
    if [ -f "$DOCS_DIR/$file" ]; then
        SIZE=$(du -h "$DOCS_DIR/$file" | cut -f1)
        echo "  ✅ $file ($SIZE)"
    else
        echo "  ❌ MISSING: $file"
        ((ERRORS++))
    fi
done

echo ""
echo "📊 Documentation Statistics:"
echo "  Total Files: $(ls -1 "$DOCS_DIR"/*.html 2>/dev/null | wc -l | tr -d ' ')"
echo "  Total Size: $(du -sh "$DOCS_DIR" | cut -f1)"
echo "  Total Lines: $(cat "$DOCS_DIR"/*.html | wc -l | tr -d ' ')"

echo ""
echo "🔗 Checking index.html links..."
LINKS=$(grep -o 'href="[^"]*\.html"' "$DOCS_DIR/index.html" | wc -l | tr -d ' ')
echo "  Found $LINKS internal links"

echo ""
echo "🎨 Checking for consistent styling..."
if grep -q "var(--accent-cyan)" "$DOCS_DIR/index.html"; then
    echo "  ✅ Theme colors present"
else
    echo "  ❌ Theme colors missing"
    ((ERRORS++))
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "✅ All validation checks passed!"
    echo "🎉 Documentation system is complete and ready!"
else
    echo "❌ Found $ERRORS error(s)"
    exit 1
fi
