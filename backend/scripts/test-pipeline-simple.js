#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Pipeline Test Suite - Simplified Runner');
console.log('==========================================');

// Set environment
process.env.NODE_ENV = 'test';

// Test our specific pipeline components only
const pipelineTests = [
  {
    name: '🔧 Opportunity Controller Tests',
    file: 'tests/controllers/opportunityController.test.js'
  },
  {
    name: '📋 Pipeline Stage Controller Tests', 
    file: 'tests/controllers/pipelineStageController.test.js'
  },
  {
    name: '🛣️ Opportunity Routes Tests',
    file: 'tests/routes/opportunities.test.js'
  },
  {
    name: '📊 Pipeline Stage Routes Tests',
    file: 'tests/routes/pipelineStages.test.js'
  }
];

let passedTests = 0;
let totalTests = pipelineTests.length;

console.log(`\n📋 Running ${totalTests} pipeline test suites...\n`);

for (const test of pipelineTests) {
  console.log(`🔍 ${test.name}`);
  console.log('─'.repeat(test.name.length + 2));
  
  try {
    // Run individual test file with proper cleanup
    execSync(`npx jest ${test.file} --forceExit --detectOpenHandles --verbose --runInBand`, {
      stdio: 'pipe',
      cwd: __dirname,
      encoding: 'utf8'
    });
    
    console.log(`✅ ${test.name} - PASSED\n`);
    passedTests++;
    
  } catch (error) {
    console.log(`❌ ${test.name} - FAILED`);
    console.log('Error details:');
    console.log(error.stdout || error.message);
    console.log('');
  }
}

// Summary
console.log('🎯 Pipeline Test Summary:');
console.log('========================');
console.log(`✅ Passed: ${passedTests}/${totalTests} test suites`);

if (passedTests === totalTests) {
  console.log('\n🚀 All pipeline tests passed!');
  console.log('📈 Pipeline implementation is working correctly.');
  
  // Generate coverage for pipeline files only
  console.log('\n📊 Generating pipeline coverage report...');
  try {
    execSync('npx jest tests/controllers/opportunityController.test.js tests/controllers/pipelineStageController.test.js --coverage --forceExit', {
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (error) {
    console.log('⚠️ Coverage generation failed, but tests passed');
  }
  
  process.exit(0);
} else {
  console.log(`\n⚠️ ${totalTests - passedTests} test suite(s) failed`);
  console.log('📋 Please review the test output above');
  process.exit(1);
}