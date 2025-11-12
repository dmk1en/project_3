const Sequencer = require('@jest/test-sequencer').default;

class PostgreSQLTestSequencer extends Sequencer {
  sort(tests) {
    // Sort tests to run in a specific order for PostgreSQL
    const testOrder = [
      'models', // Run model tests first
      'controllers', // Then controller tests
      'routes', // Then route tests  
      'integration' // Finally integration tests
    ];

    return tests.sort((testA, testB) => {
      const orderA = this.getTestOrder(testA.path, testOrder);
      const orderB = this.getTestOrder(testB.path, testOrder);
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If same order, sort alphabetically
      return testA.path.localeCompare(testB.path);
    });
  }

  getTestOrder(testPath, testOrder) {
    for (let i = 0; i < testOrder.length; i++) {
      if (testPath.includes(testOrder[i])) {
        return i;
      }
    }
    return testOrder.length; // Unknown tests go last
  }
}

module.exports = PostgreSQLTestSequencer;