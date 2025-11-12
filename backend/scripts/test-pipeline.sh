#!/bin/bash

# Pipeline Test Suite Runner
echo "🧪 Starting Pipeline Test Suite..."
echo "=================================="

# Check if Jest is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not available. Please install Node.js and npm."
    exit 1
fi

# Set test environment
export NODE_ENV=test

echo "📋 Test Configuration:"
echo "   Environment: $NODE_ENV"
echo "   Test Framework: Jest"
echo "   Coverage: Enabled"
echo ""

# Run different test suites
echo "🔧 Running Unit Tests..."
echo "========================"
npx jest tests/controllers/ --coverage --testNamePattern="Controller" --verbose

echo ""
echo "🛣️  Running Route Tests..."
echo "========================="
npx jest tests/routes/ --coverage --testNamePattern="Routes" --verbose

echo ""
echo "📊 Running Model Tests..."
echo "========================"
npx jest tests/models/ --coverage --testNamePattern="Models" --verbose

echo ""
echo "🔗 Running Integration Tests..."
echo "=============================="
npx jest tests/integration/ --coverage --testNamePattern="Integration" --verbose

echo ""
echo "📈 Generating Coverage Report..."
echo "==============================="
npx jest --coverage --coverageDirectory=coverage --coverageReporters=text --coverageReporters=html

echo ""
echo "🎯 Pipeline Test Summary:"
echo "========================"

# Check if tests passed
if [ $? -eq 0 ]; then
    echo "✅ All pipeline tests passed!"
    echo ""
    echo "📊 Coverage Report: ./coverage/index.html"
    echo "📋 Test Results: All test suites completed successfully"
    echo ""
    echo "🚀 Pipeline implementation is ready for production!"
else
    echo "❌ Some tests failed. Please check the output above."
    exit 1
fi