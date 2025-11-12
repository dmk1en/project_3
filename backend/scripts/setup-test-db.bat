@echo off
REM PostgreSQL Test Database Setup Script for Windows
echo 🐘 Setting up PostgreSQL test database...
echo ========================================

REM Check if .env.test exists
if not exist .env.test (
    echo ❌ .env.test file not found!
    exit /b 1
)

REM Load environment variables from .env.test
for /f "tokens=1,2 delims==" %%a in (.env.test) do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" set %%a=%%b
)

REM Set default values if not set
if not defined DB_HOST set DB_HOST=localhost
if not defined DB_PORT set DB_PORT=5432
if not defined DB_USER set DB_USER=postgres
if not defined DB_NAME set DB_NAME=crm_test_db

echo 📋 Database Configuration:
echo    Host: %DB_HOST%
echo    Port: %DB_PORT%
echo    User: %DB_USER%
echo    Database: %DB_NAME%
echo.

REM Check if PostgreSQL is accessible
echo 🔍 Checking PostgreSQL connection...
pg_isready -h %DB_HOST% -p %DB_PORT% -U %DB_USER% >nul 2>&1
if errorlevel 1 (
    echo ❌ PostgreSQL is not running or not accessible
    echo Please start PostgreSQL and ensure it's accessible on %DB_HOST%:%DB_PORT%
    exit /b 1
)

echo ✅ PostgreSQL is running

REM Create test database
echo 🗄️ Creating test database...
createdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME% >nul 2>&1
if errorlevel 1 (
    echo 📋 Database '%DB_NAME%' already exists or creation failed
    echo    Attempting to drop and recreate...
    dropdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME% >nul 2>&1
    createdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME% >nul 2>&1
    if errorlevel 1 (
        echo ❌ Failed to create test database
        exit /b 1
    )
)

echo ✅ Test database '%DB_NAME%' created successfully

REM Test connection
echo 🔌 Testing database connection...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo ❌ Failed to connect to test database
    exit /b 1
)

echo ✅ Successfully connected to test database
echo.
echo 🎉 Test database setup completed!
echo You can now run tests with: npm run test:pipeline