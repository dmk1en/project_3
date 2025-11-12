const { execSync } = require('child_process');
const path = require('path');

// Load test environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

console.log('🔧 PostgreSQL Pipeline Test Setup');
console.log('=================================');

console.log('📋 Database Configuration:');
console.log(`   Host: ${process.env.DB_HOST}`);
console.log(`   Port: ${process.env.DB_PORT}`);
console.log(`   Username: ${process.env.DB_USERNAME}`);
console.log(`   Test DB: ${process.env.DB_NAME}`);
console.log('');

// Step 1: Create test database if it doesn't exist
console.log('🗄️ Setting up test database...');
try {
  const createDbCommand = `PGPASSWORD=${process.env.DB_PASSWORD} psql -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USERNAME} -d postgres -c "CREATE DATABASE ${process.env.DB_NAME};" 2>/dev/null || echo "Database may already exist"`;
  
  execSync(createDbCommand, { stdio: 'pipe' });
  console.log('✅ Test database ready');
} catch (error) {
  console.log('ℹ️ Database may already exist or creation failed, continuing...');
}

// Step 2: Run migrations
console.log('🔄 Running database migrations...');
try {
  execSync('npm run migrate', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'test' }
  });
  console.log('✅ Migrations completed');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.log('ℹ️ Continuing with existing schema...');
}

// Step 3: Seed test data
console.log('🌱 Seeding test data...');
try {
  execSync('npm run seed', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'test' }
  });
  console.log('✅ Test data seeded');
} catch (error) {
  console.error('❌ Seeding failed:', error.message);
  console.log('ℹ️ Continuing without seed data...');
}

// Step 4: Run pipeline tests
console.log('🧪 Running pipeline tests...');
console.log('============================');

const testSuites = [
  {
    name: '🔧 Opportunity Controller Tests',
    command: 'npx jest tests/controllers/opportunityController.test.js --verbose'
  },
  {
    name: '🏗️ Pipeline Stage Controller Tests', 
    command: 'npx jest tests/controllers/pipelineStageController.test.js --verbose'
  },
  {
    name: '🛣️ Opportunity Routes Tests',
    command: 'npx jest tests/routes/opportunities.test.js --verbose'
  },
  {
    name: '🛣️ Pipeline Stage Routes Tests',
    command: 'npx jest tests/routes/pipelineStages.test.js --verbose'
  },
  {
    name: '📊 Pipeline Model Tests',
    command: 'npx jest tests/models/pipeline.test.js --verbose'
  },
  {
    name: '🔗 Pipeline Integration Tests',
    command: 'npx jest tests/integration/pipeline.integration.test.js --verbose'
  }
];

let passedTests = 0;
let totalTests = testSuites.length;

for (const suite of testSuites) {
  console.log(`\n${suite.name}`);
  console.log('='.repeat(suite.name.length - 2));
  
  try {
    execSync(suite.command, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test' }
    });
    console.log(`✅ ${suite.name} - PASSED`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${suite.name} - FAILED`);
    console.log(`   Error: ${error.message}`);
  }
}

// Step 5: Generate coverage report
console.log('\n📈 Generating coverage report...');
try {
  execSync('npx jest tests/ --coverage --coverageDirectory=coverage', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'test' }
  });
  console.log('✅ Coverage report generated');
} catch (error) {
  console.log('⚠️ Coverage report generation failed');
}

// Final summary
console.log('\n🎯 Pipeline Test Results:');
console.log('=========================');
console.log(`✅ Passed: ${passedTests}/${totalTests} test suites`);

if (passedTests === totalTests) {
  console.log('\n🎉 All pipeline tests passed!');
  console.log('📊 Coverage report: ./coverage/index.html');
  console.log('🚀 Pipeline implementation is ready for production!');
  process.exit(0);
} else {
  console.log(`\n⚠️ ${totalTests - passedTests} test suite(s) failed`);
  console.log('📋 Please review the test output above');
  process.exit(1);
}