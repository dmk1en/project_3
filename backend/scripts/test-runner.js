const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  constructor() {
    this.testDir = path.join(__dirname, '../test');
    this.scriptsDir = path.join(__dirname);
  }

  async setupTestDatabase() {
    console.log('🐘 Setting up test database...\n');
    
    return new Promise((resolve, reject) => {
      const dbSetupScript = path.join(this.scriptsDir, 'db-setup.js');
      const command = `node "${dbSetupScript}" --complete`;
      
      exec(command, { 
        cwd: path.join(__dirname, '..'),
        env: { 
          ...process.env, 
          NODE_ENV: 'test' 
        }
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Database setup failed:', error.message);
          console.error('stderr:', stderr);
          reject(error);
          return;
        }
        
        console.log(stdout);
        if (stderr) {
          console.warn('⚠️ Setup warnings:', stderr);
        }
        
        console.log('✅ Database setup completed\n');
        resolve();
      });
    });
  }

  async runTests(pattern = null) {
    console.log('🧪 Running tests...\n');
    
    return new Promise((resolve, reject) => {
      let jestCommand = 'npx jest';
      
      if (pattern) {
        jestCommand += ` --testPathPattern="${pattern}"`;
      }
      
      // Add Jest options
      jestCommand += ' --verbose --detectOpenHandles --forceExit';
      
      exec(jestCommand, { 
        cwd: path.join(__dirname, '..'),
        env: { 
          ...process.env, 
          NODE_ENV: 'test' 
        }
      }, (error, stdout, stderr) => {
        console.log(stdout);
        
        if (stderr) {
          console.warn('⚠️ Test warnings:', stderr);
        }
        
        if (error) {
          console.error('❌ Tests failed with exit code:', error.code);
          reject(error);
          return;
        }
        
        console.log('✅ All tests passed!\n');
        resolve();
      });
    });
  }

  async runPipelineTests() {
    console.log('🔄 Running complete pipeline test suite...\n');
    
    try {
      // Setup database
      await this.setupTestDatabase();
      
      // Run pipeline-specific tests
      await this.runTests('pipeline|opportunity|stage');
      
      console.log('🎉 Pipeline test suite completed successfully!');
      
    } catch (error) {
      console.error('💥 Pipeline test suite failed:', error.message);
      process.exit(1);
    }
  }

  async runAllTests() {
    console.log('🧪 Running complete test suite...\n');
    
    try {
      // Setup database
      await this.setupTestDatabase();
      
      // Run all tests
      await this.runTests();
      
      console.log('🎉 Complete test suite passed!');
      
    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
      process.exit(1);
    }
  }

  showHelp() {
    console.log(`
🧪 Test Runner Usage:
===================

Commands:
  npm run test:pipeline    - Run pipeline-specific tests
  npm run test:all        - Run complete test suite
  npm run test:setup      - Setup test database only
  npm run test:unit       - Run unit tests only
  npm run test:integration - Run integration tests only

Examples:
  node scripts/test-runner.js --pipeline
  node scripts/test-runner.js --all
  node scripts/test-runner.js --setup-only
  node scripts/test-runner.js --pattern="contact"

Options:
  --pipeline      Run pipeline tests only
  --all          Run all tests
  --setup-only   Setup database without running tests
  --pattern=X    Run tests matching pattern X
  --help         Show this help
`);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const testRunner = new TestRunner();
  
  if (args.includes('--help')) {
    testRunner.showHelp();
    return;
  }
  
  if (args.includes('--setup-only')) {
    await testRunner.setupTestDatabase();
    return;
  }
  
  if (args.includes('--pipeline')) {
    await testRunner.runPipelineTests();
    return;
  }
  
  if (args.includes('--all')) {
    await testRunner.runAllTests();
    return;
  }
  
  // Check for pattern argument
  const patternArg = args.find(arg => arg.startsWith('--pattern='));
  if (patternArg) {
    const pattern = patternArg.split('=')[1];
    await testRunner.setupTestDatabase();
    await testRunner.runTests(pattern);
    return;
  }
  
  // Default behavior
  console.log('🔄 Running pipeline tests by default...\n');
  await testRunner.runPipelineTests();
}

// Export for programmatic use
module.exports = TestRunner;

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}