const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Pipeline Test Suite Runner');
console.log('==============================');

// Set environment
process.env.NODE_ENV = 'test';

const testSuites = [
  {
    name: '🔧 Unit Tests - Controllers',
    pattern: 'tests/controllers/',
    options: '--testNamePattern="Controller"'
  },
  {
    name: '🛣️ Unit Tests - Routes', 
    pattern: 'tests/routes/',
    options: '--testNamePattern="Routes"'
  },
  {
    name: '📊 Unit Tests - Models',
    pattern: 'tests/models/',
    options: '--testNamePattern="Models"'
  },
  {
    name: '🔗 Integration Tests',
    pattern: 'tests/integration/',
    options: '--testNamePattern="Integration"'
  }
];

let allPassed = true;

for (const suite of testSuites) {
  console.log(`\n${suite.name}`);
  console.log('='.repeat(suite.name.length - 2));
  
  try {
    execSync(`npx jest ${suite.pattern} ${suite.options} --verbose`, {
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log(`✅ ${suite.name} - PASSED`);
  } catch (error) {
    console.log(`❌ ${suite.name} - FAILED`);
    allPassed = false;
  }
}

// Generate coverage report
console.log('\n📈 Generating Coverage Report...');
console.log('================================');

try {
  execSync('npx jest --coverage --coverageDirectory=coverage --coverageReporters=text --coverageReporters=html', {
    stdio: 'inherit',
    cwd: __dirname
  });
} catch (error) {
  console.log('⚠️ Coverage report generation failed');
}

// Summary
console.log('\n🎯 Pipeline Test Summary:');
console.log('========================');

if (allPassed) {
  console.log('✅ All pipeline tests passed!');
  console.log('\n📊 Coverage Report: ./coverage/index.html');
  console.log('📋 Test Results: All test suites completed successfully');
  console.log('\n🚀 Pipeline implementation is ready for production!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please check the output above.');
  process.exit(1);
}