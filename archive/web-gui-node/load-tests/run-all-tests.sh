#!/bin/bash


set -e

echo "🚀 Starting DinoAir Load Testing Suite"
echo "======================================"

REPORTS_DIR="./load-tests/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_PREFIX="load_test_${TIMESTAMP}"

mkdir -p "$REPORTS_DIR"

echo "🔍 Checking if DinoAir server is running..."
if ! curl -s http://localhost:3000/api/health/ping > /dev/null; then
    echo "❌ DinoAir server is not running on localhost:3000"
    echo "Please start the server with: npm start"
    exit 1
fi

echo "✅ Server is running"

run_test() {
    local test_name=$1
    local test_file=$2
    local report_file="${REPORTS_DIR}/${REPORT_PREFIX}_${test_name}.json"
    
    echo ""
    echo "🧪 Running $test_name load test..."
    echo "Test file: $test_file"
    echo "Report: $report_file"
    
    if npx artillery run "$test_file" --output "$report_file"; then
        echo "✅ $test_name test completed successfully"
        
        local html_report="${REPORTS_DIR}/${REPORT_PREFIX}_${test_name}.html"
        npx artillery report "$report_file" --output "$html_report"
        echo "📊 HTML report generated: $html_report"
    else
        echo "❌ $test_name test failed"
        return 1
    fi
}

echo ""
echo "Running individual test suites..."

run_test "health" "./load-tests/scenarios/health-api.yml"

run_test "chat" "./load-tests/scenarios/chat-api.yml"

run_test "artifacts" "./load-tests/scenarios/artifacts-api.yml"

echo ""
echo "📈 Generating summary report..."
SUMMARY_FILE="${REPORTS_DIR}/${REPORT_PREFIX}_summary.txt"

cat > "$SUMMARY_FILE" << EOF
DinoAir Load Testing Summary
===========================
Timestamp: $(date)
Test Run ID: $TIMESTAMP

Test Results:
EOF

for test in health chat artifacts; do
    report_file="${REPORTS_DIR}/${REPORT_PREFIX}_${test}.json"
    if [ -f "$report_file" ]; then
        echo "✅ $test: Report generated" >> "$SUMMARY_FILE"
    else
        echo "❌ $test: Report missing" >> "$SUMMARY_FILE"
    fi
done

echo ""
echo "🎉 Load testing suite completed!"
echo "📁 Reports saved to: $REPORTS_DIR"
echo "📄 Summary: $SUMMARY_FILE"
echo ""
echo "To view detailed results:"
echo "  - Open HTML reports in your browser"
echo "  - Use 'npx artillery report <json-file>' for custom analysis"
echo ""
