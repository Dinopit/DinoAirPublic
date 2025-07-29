#!/bin/bash


set -e

echo "🚀 Running Quick Load Test for DinoAir"
echo "====================================="

if ! curl -s http://localhost:3000/api/health/ping > /dev/null; then
    echo "❌ DinoAir server is not running on localhost:3000"
    echo "Please start the server first"
    exit 1
fi

echo "✅ Server is running"

QUICK_TEST_FILE="/tmp/dinoair_quick_test.yml"

cat > "$QUICK_TEST_FILE" << 'EOF'
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 30
      arrivalRate: 2
      name: "Quick Test"
  defaults:
    headers:
      'Content-Type': 'application/json'

scenarios:
  - name: "Health Check"
    weight: 50
    flow:
      - get:
          url: "/api/health/ping"
          expect:
            - statusCode: 200

  - name: "Health Status"
    weight: 30
    flow:
      - get:
          url: "/api/health"
          expect:
            - statusCode: [200, 503]

  - name: "Chat Models"
    weight: 20
    flow:
      - get:
          url: "/api/chat/models"
          expect:
            - statusCode: [200, 503]
EOF

echo "🧪 Running quick load test (30 seconds)..."

if npx artillery run "$QUICK_TEST_FILE"; then
    echo "✅ Quick test completed successfully!"
    echo "🎯 System is ready for full load testing"
else
    echo "❌ Quick test failed"
    echo "🔧 Please check server logs and try again"
    exit 1
fi

rm -f "$QUICK_TEST_FILE"

echo ""
echo "Next steps:"
echo "  - Run full test suite: ./load-tests/run-all-tests.sh"
echo "  - Run specific tests: npx artillery run load-tests/scenarios/<test-name>.yml"
echo ""
