# Pipeline Test Suite Documentation

## 🎯 Overview

This test suite provides comprehensive testing for the complete pipeline implementation including opportunities management, pipeline stages, and analytics functionality.

## 📁 Test Structure

```
tests/
├── setup/
│   └── testSetup.js          # Global test configuration and helpers
├── controllers/
│   ├── opportunityController.test.js     # Opportunity CRUD operations
│   └── pipelineStageController.test.js   # Pipeline stage management
├── routes/
│   ├── opportunities.test.js             # Opportunity API endpoints
│   └── pipelineStages.test.js           # Pipeline stage API endpoints
├── models/
│   └── pipeline.test.js                 # Model validation and relationships
└── integration/
    └── pipeline.integration.test.js      # End-to-end workflow testing
```

## 🔧 Test Categories

### 1. **Unit Tests - Controllers**
- **File**: `tests/controllers/opportunityController.test.js`
- **Coverage**: All CRUD operations, stage movements, error handling
- **Key Tests**:
  - `GET /opportunities` - Pagination, filtering, search
  - `POST /opportunities` - Creation with validation
  - `PUT /opportunities/:id/stage` - Stage movement with activity tracking
  - Error handling for invalid data and missing records

- **File**: `tests/controllers/pipelineStageController.test.js`
- **Coverage**: Stage management, reordering, deletion with migration
- **Key Tests**:
  - Stage CRUD operations
  - Reordering functionality
  - Safe deletion with opportunity migration
  - Status toggling and analytics

### 2. **Unit Tests - Routes**
- **File**: `tests/routes/opportunities.test.js`
- **Coverage**: Route validation, middleware integration
- **Key Tests**:
  - Parameter validation (UUIDs, ranges, required fields)
  - Authorization middleware
  - Request/response format validation

- **File**: `tests/routes/pipelineStages.test.js`
- **Coverage**: Pipeline route validation and authorization
- **Key Tests**:
  - Stage management route validation
  - Reordering API validation
  - Permission-based access control

### 3. **Unit Tests - Models**
- **File**: `tests/models/pipeline.test.js`
- **Coverage**: Data model validation and relationships
- **Key Tests**:
  - Field validation (length, format, ranges)
  - Relationship integrity
  - Constraint validation
  - Index verification

### 4. **Integration Tests**
- **File**: `tests/integration/pipeline.integration.test.js`
- **Coverage**: Complete workflow simulation
- **Key Tests**:
  - Full opportunity lifecycle (Lead → Closed Won)
  - Pipeline management workflows
  - Analytics generation
  - Error handling and edge cases

## 🚀 Running Tests

### Quick Test Commands

```bash
# Run all pipeline tests
npm run test:pipeline

# Run specific test categories
npm run test:controllers
npm run test:routes
npm run test:models
npm run test:integration

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Advanced Test Commands

```bash
# Run specific test file
npx jest tests/controllers/opportunityController.test.js

# Run tests matching pattern
npx jest --testNamePattern="opportunity"

# Run with detailed output
npx jest --verbose

# Run with coverage for specific files
npx jest --coverage --collectCoverageFrom="src/controllers/opportunityController.js"
```

## 📊 Test Coverage Goals

| Component | Target Coverage | Current Status |
|-----------|----------------|----------------|
| Controllers | 95%+ | ✅ Comprehensive |
| Routes | 90%+ | ✅ Complete |
| Models | 85%+ | ✅ Thorough |
| Integration | 80%+ | ✅ End-to-end |

## 🧪 Test Data Helpers

### Available Test Helpers (from `testSetup.js`)

```javascript
// Create test entities
testHelpers.createTestUser()
testHelpers.createTestContact() 
testHelpers.createTestCompany()
testHelpers.createTestOpportunity()
testHelpers.createTestStage()

// Mock authentication
mockAuth(user) // Returns middleware that sets req.user
```

### Example Usage

```javascript
describe('My Test', () => {
  it('should work with test data', () => {
    const user = testHelpers.createTestUser();
    const opportunity = testHelpers.createTestOpportunity();
    
    expect(opportunity.assignedTo).toBe(user.id);
  });
});
```

## 🔍 What Each Test Suite Covers

### Opportunity Controller Tests
- ✅ **CRUD Operations**: Create, read, update, delete opportunities
- ✅ **Filtering & Search**: Pagination, search terms, stage filtering
- ✅ **Stage Management**: Moving opportunities between stages
- ✅ **Kanban View**: Opportunities grouped by stage
- ✅ **Activity Tracking**: Automatic activity creation
- ✅ **Error Handling**: Validation errors, not found errors
- ✅ **Relationships**: Contact, company, stage associations

### Pipeline Stage Controller Tests
- ✅ **Stage CRUD**: Create, read, update, delete stages
- ✅ **Reordering**: Drag-and-drop stage reordering
- ✅ **Safe Deletion**: Opportunity migration before deletion
- ✅ **Status Management**: Activate/deactivate stages
- ✅ **Analytics**: Stage conversion and performance metrics
- ✅ **Business Rules**: Validation of stage operations
- ✅ **Bulk Operations**: Multiple stage updates

### Route Tests
- ✅ **Validation Middleware**: Input sanitization and validation
- ✅ **Authorization**: Role-based access control
- ✅ **Parameter Validation**: UUID format, ranges, required fields
- ✅ **Response Formats**: Consistent JSON responses
- ✅ **Error Responses**: Proper HTTP status codes
- ✅ **Query Parameters**: Filtering, pagination, sorting

### Model Tests
- ✅ **Field Validation**: Data types, lengths, constraints
- ✅ **Relationships**: Foreign key integrity
- ✅ **Indexes**: Performance optimization validation
- ✅ **Constraints**: Business rule enforcement
- ✅ **Enums**: Valid enum value testing
- ✅ **Defaults**: Default value verification

### Integration Tests
- ✅ **Complete Workflows**: End-to-end opportunity lifecycle
- ✅ **Pipeline Management**: Full stage management workflows  
- ✅ **Analytics Generation**: Comprehensive reporting
- ✅ **Error Scenarios**: Edge cases and error handling
- ✅ **Performance**: Concurrent operations
- ✅ **Business Logic**: Complex business rule validation

## 🏗️ Test Environment Setup

### Prerequisites
```bash
# Install dependencies
npm install

# Setup test environment
cp .env.example .env.test

# Run database migrations (if using real DB)
npm run migrate
```

### Test Database Options

**Option 1: SQLite In-Memory (Default)**
```bash
TEST_DATABASE_URL=sqlite::memory:
```
- ✅ Fast test execution
- ✅ No setup required
- ✅ Isolated test runs

**Option 2: PostgreSQL Test Database**
```bash
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/crm_test
```
- ✅ Production-like environment
- ✅ Full feature testing
- ⚠️ Requires setup

## 📈 Continuous Integration

### GitHub Actions Example

```yaml
name: Pipeline Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm ci
      - run: npm run test:pipeline
      - run: npm run test:coverage
```

## 🐛 Debugging Tests

### Common Issues

1. **Mock Module Issues**
   ```bash
   # Clear Jest cache
   npx jest --clearCache
   ```

2. **Database Connection Issues**
   ```bash
   # Check test environment
   echo $NODE_ENV
   ```

3. **Timeout Issues**
   ```bash
   # Increase timeout in jest.config.js
   testTimeout: 30000
   ```

### Debug Mode

```bash
# Run with debug output
DEBUG=* npm run test:pipeline

# Run single test in debug mode
npx jest --runInBand --detectOpenHandles tests/specific.test.js
```

## 📝 Writing New Tests

### Test File Template

```javascript
const request = require('supertest');
const myController = require('../../src/controllers/myController');

describe('MyController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('myMethod', () => {
    it('should do something', async () => {
      // Arrange
      const testData = testHelpers.createTestData();
      
      // Act
      const result = await myController.myMethod(testData);
      
      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

### Best Practices

1. **Use Descriptive Test Names**
   ```javascript
   it('should return 404 when opportunity not found')
   it('should create activity when moving opportunity to new stage')
   ```

2. **Follow AAA Pattern**
   - **Arrange**: Set up test data and mocks
   - **Act**: Execute the function under test
   - **Assert**: Verify the results

3. **Mock External Dependencies**
   ```javascript
   jest.mock('../../src/models');
   ```

4. **Use Test Helpers**
   ```javascript
   const testUser = testHelpers.createTestUser();
   ```

5. **Test Error Cases**
   ```javascript
   it('should handle database errors gracefully', async () => {
     Model.findAll.mockRejectedValue(new Error('DB Error'));
     // ... test error handling
   });
   ```

## 🎯 Test Results Interpretation

### Success Indicators
- ✅ All tests pass
- ✅ Coverage above target thresholds
- ✅ No memory leaks or hanging processes
- ✅ Fast execution times (< 30 seconds total)

### Failure Analysis
- ❌ **Test Failures**: Check error messages and stack traces
- ❌ **Coverage Gaps**: Add tests for uncovered code paths
- ❌ **Flaky Tests**: Look for race conditions or incomplete mocks
- ❌ **Performance Issues**: Profile slow tests and optimize

## 🚀 Production Readiness Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass  
- [ ] Coverage meets minimum thresholds
- [ ] No security vulnerabilities in test dependencies
- [ ] Tests run successfully in CI/CD pipeline
- [ ] Performance benchmarks met
- [ ] Error handling thoroughly tested
- [ ] Edge cases covered

---

**Pipeline testing is comprehensive and production-ready! 🎉**