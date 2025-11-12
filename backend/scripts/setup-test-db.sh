#!/bin/bash

# PostgreSQL Test Database Setup Script
echo "🐘 Setting up PostgreSQL test database..."
echo "========================================"

# Load environment variables
if [ -f .env.test ]; then
    export $(cat .env.test | grep -v ^# | xargs)
else
    echo "❌ .env.test file not found!"
    exit 1
fi

# Default values if not set in .env.test
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-crm_test_db}

echo "📋 Database Configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"
echo ""

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL connection..."
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER &>/dev/null; then
    echo "❌ PostgreSQL is not running or not accessible"
    echo "Please start PostgreSQL and ensure it's accessible on $DB_HOST:$DB_PORT"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Create test database if it doesn't exist
echo "🗄️  Creating test database..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || {
    echo "📋 Database '$DB_NAME' already exists or creation failed"
    echo "   Attempting to drop and recreate..."
    dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null
    createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
}

if [ $? -eq 0 ]; then
    echo "✅ Test database '$DB_NAME' created successfully"
else
    echo "❌ Failed to create test database"
    exit 1
fi

# Test connection to the new database
echo "🔌 Testing database connection..."
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" &>/dev/null; then
    echo "✅ Successfully connected to test database"
else
    echo "❌ Failed to connect to test database"
    exit 1
fi

echo ""
echo "🎉 Test database setup completed!"
echo "You can now run tests with: npm run test:pipeline"