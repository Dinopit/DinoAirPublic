#!/bin/bash

# Visual Testing Setup Script for DinoAir
# This script helps set up visual regression testing with baseline screenshots

set -e

echo "🦕 DinoAir Visual Testing Setup"
echo "================================"

# Check if we're in the right directory
if [ ! -f "playwright.config.ts" ]; then
    echo "❌ Error: playwright.config.ts not found. Please run this script from the web-gui directory."
    exit 1
fi

# Install Playwright browsers if not already installed
echo "📦 Installing Playwright browsers..."
if ! npx playwright install --with-deps > /dev/null 2>&1; then
    echo "⚠️  Warning: Failed to install Playwright browsers. You may need to install them manually."
    echo "   Try running: npx playwright install --with-deps"
else
    echo "✅ Playwright browsers installed successfully"
fi

# Generate baseline screenshots
echo "📸 Generating baseline screenshots..."
echo "   This will create baseline images for visual regression testing."
echo "   The application will be started temporarily for screenshot capture."

if npm run test:visual:update; then
    echo "✅ Baseline screenshots generated successfully"
    echo "   Screenshots saved to test-results/ directory"
    
    # Check if any screenshots were created
    if [ -d "test-results" ] && [ "$(ls -A test-results 2>/dev/null)" ]; then
        echo "📊 Generated screenshots:"
        find test-results -name "*.png" | head -10 | sed 's/^/   - /'
        if [ "$(find test-results -name "*.png" | wc -l)" -gt 10 ]; then
            echo "   ... and $(find test-results -name "*.png" | wc -l) total screenshots"
        fi
    fi
else
    echo "❌ Failed to generate baseline screenshots"
    echo "   Please ensure the application builds and runs correctly"
    echo "   Try: npm run build && npm run dev"
    exit 1
fi

echo ""
echo "🎉 Visual testing setup complete!"
echo ""
echo "Next steps:"
echo "1. Review the generated screenshots in test-results/ directory"
echo "2. Commit the baseline screenshots: git add test-results/ && git commit -m 'Add visual testing baselines'"
echo "3. Run visual tests: npm run test:visual"
echo "4. Update baselines when UI changes: npm run test:visual:update"
echo ""
echo "For more information, see docs/VISUAL_TESTING.md"