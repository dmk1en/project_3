const { Sequelize } = require('sequelize');
const TestDatabaseManager = require('./testDatabaseManager');
require('dotenv').config({ path: '.env.test' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';

// Test database setup
let testDbManager;

beforeAll(async () => {
  console.log('🚀 Setting up test environment...');
  
  try {
    testDbManager = new TestDatabaseManager();
    await testDbManager.setupTestDatabase();
    
    // Make sequelize available globally for tests that need it
    global.testSequelize = testDbManager.getSequelize();
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    console.error('Make sure PostgreSQL is running and test database exists');
    throw error;
  }
}, 60000); // 60 second timeout for setup

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  if (testDbManager) {
    await testDbManager.teardownTestDatabase();
  }
}, 30000); // 30 second timeout for cleanup

// Clean up after each test
afterEach(async () => {
  if (global.testSequelize) {
    // Clear all data but keep schema
    try {
      const tables = [
        'activities', 'opportunities', 'social_profiles', 
        'contacts', 'companies', 'user_sessions', 'users',
        'potential_leads', 'pdl_search_queries'
      ];
      
      for (const table of tables) {
        try {
          await global.testSequelize.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        } catch (error) {
          // Table might not exist, ignore
        }
      }
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }
});

// Helper functions for tests
global.testHelpers = {
  createTestUser: () => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: 'sales_rep'
  }),

  createTestContact: () => ({
    id: '123e4567-e89b-12d3-a456-426614174001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    source: 'manual',
    leadStatus: 'new'
  }),

  createTestCompany: () => ({
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Test Company',
    industry: 'Technology'
  }),

  createTestOpportunity: () => ({
    id: '123e4567-e89b-12d3-a456-426614174003',
    name: 'Test Opportunity',
    contactId: '123e4567-e89b-12d3-a456-426614174001',
    companyId: '123e4567-e89b-12d3-a456-426614174002',
    stageId: '123e4567-e89b-12d3-a456-426614174004',
    value: 10000,
    assignedTo: '123e4567-e89b-12d3-a456-426614174000'
  }),

  createTestStage: () => ({
    id: '123e4567-e89b-12d3-a456-426614174004',
    name: 'Lead',
    displayOrder: 1,
    probabilityPercent: 10,
    color: '#FF6B6B',
    isActive: true
  })
};

// Mock authentication middleware for testing
global.mockAuth = (user = null) => {
  return (req, res, next) => {
    req.user = user || global.testHelpers.createTestUser();
    next();
  };
};