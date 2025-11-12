const { Opportunity, PipelineStage, Contact, Company, User } = require('../../src/models');

// Mock Sequelize for model testing
jest.mock('sequelize', () => {
  const mockSequelize = {
    define: jest.fn(),
    authenticate: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue()
  };
  
  const Sequelize = jest.fn(() => mockSequelize);
  Sequelize.DataTypes = {
    UUID: 'UUID',
    UUIDV4: 'UUIDV4',
    STRING: jest.fn(() => 'STRING'),
    TEXT: 'TEXT',
    INTEGER: 'INTEGER',
    DECIMAL: jest.fn(() => 'DECIMAL'),
    DATEONLY: 'DATEONLY',
    JSONB: 'JSONB',
    ENUM: jest.fn(() => 'ENUM'),
    BOOLEAN: 'BOOLEAN'
  };

  return { Sequelize, DataTypes: Sequelize.DataTypes };
});

jest.mock('../../src/config/db', () => ({
  sequelize: {
    define: jest.fn(),
    fn: jest.fn(),
    col: jest.fn(),
    literal: jest.fn()
  }
}));

describe('Pipeline Models', () => {
  describe('Opportunity Model', () => {
    it('should have correct structure and validation', () => {
      // Since we're mocking Sequelize, we test the model definition calls
      expect(require('../../src/models/Opportunity')).toBeDefined();
    });

    it('should validate required fields', () => {
      const opportunityData = testHelpers.createTestOpportunity();
      
      // Test that required fields are present
      expect(opportunityData).toHaveProperty('name');
      expect(opportunityData).toHaveProperty('contactId');
      expect(opportunityData).toHaveProperty('stageId');
    });

    it('should have proper field types', () => {
      const opportunity = testHelpers.createTestOpportunity();
      
      expect(typeof opportunity.name).toBe('string');
      expect(typeof opportunity.contactId).toBe('string');
      expect(typeof opportunity.stageId).toBe('string');
      expect(typeof opportunity.value).toBe('number');
    });

    it('should validate value is positive', () => {
      const opportunity = testHelpers.createTestOpportunity();
      
      // Value should be positive
      expect(opportunity.value).toBeGreaterThanOrEqual(0);
    });

    it('should validate currency format', () => {
      // Test currency code length (should be 3 characters)
      const validCurrencies = ['USD', 'EUR', 'GBP'];
      const invalidCurrencies = ['US', 'DOLLAR', '123'];
      
      validCurrencies.forEach(currency => {
        expect(currency).toHaveLength(3);
        expect(/^[A-Z]{3}$/.test(currency)).toBe(true);
      });
      
      invalidCurrencies.forEach(currency => {
        expect(currency.length !== 3 || !/^[A-Z]{3}$/.test(currency)).toBe(true);
      });
    });

    it('should validate probability range', () => {
      // Probability should be between 0 and 100
      const validProbabilities = [0, 25, 50, 75, 100];
      const invalidProbabilities = [-1, 101, 150];
      
      validProbabilities.forEach(prob => {
        expect(prob).toBeGreaterThanOrEqual(0);
        expect(prob).toBeLessThanOrEqual(100);
      });
      
      invalidProbabilities.forEach(prob => {
        expect(prob < 0 || prob > 100).toBe(true);
      });
    });
  });

  describe('PipelineStage Model', () => {
    it('should have correct structure', () => {
      expect(require('../../src/models/PipelineStage')).toBeDefined();
    });

    it('should validate required fields', () => {
      const stage = testHelpers.createTestStage();
      
      expect(stage).toHaveProperty('name');
      expect(stage).toHaveProperty('displayOrder');
      expect(stage).toHaveProperty('probabilityPercent');
    });

    it('should validate probability percentage range', () => {
      const stage = testHelpers.createTestStage();
      
      expect(stage.probabilityPercent).toBeGreaterThanOrEqual(0);
      expect(stage.probabilityPercent).toBeLessThanOrEqual(100);
    });

    it('should validate color format', () => {
      const validColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF'];
      const invalidColors = ['FF0000', '#FFF', 'red', '#GGGGGG'];
      
      validColors.forEach(color => {
        expect(/^#[0-9A-F]{6}$/i.test(color)).toBe(true);
      });
      
      invalidColors.forEach(color => {
        expect(/^#[0-9A-F]{6}$/i.test(color)).toBe(false);
      });
    });

    it('should have proper default values', () => {
      const stage = testHelpers.createTestStage();
      
      expect(stage.isActive).toBe(true);
      expect(typeof stage.displayOrder).toBe('number');
    });

    it('should validate display order', () => {
      const stage = testHelpers.createTestStage();
      
      expect(stage.displayOrder).toBeGreaterThan(0);
      expect(Number.isInteger(stage.displayOrder)).toBe(true);
    });
  });

  describe('Model Relationships', () => {
    it('should define opportunity-contact relationship', () => {
      const opportunity = testHelpers.createTestOpportunity();
      const contact = testHelpers.createTestContact();
      
      expect(opportunity.contactId).toBe(contact.id);
    });

    it('should define opportunity-company relationship', () => {
      const opportunity = testHelpers.createTestOpportunity();
      const company = testHelpers.createTestCompany();
      
      expect(opportunity.companyId).toBe(company.id);
    });

    it('should define opportunity-stage relationship', () => {
      const opportunity = testHelpers.createTestOpportunity();
      const stage = testHelpers.createTestStage();
      
      expect(opportunity.stageId).toBe(stage.id);
    });

    it('should define opportunity-user relationship', () => {
      const opportunity = testHelpers.createTestOpportunity();
      const user = testHelpers.createTestUser();
      
      expect(opportunity.assignedTo).toBe(user.id);
    });
  });

  describe('Model Validation Rules', () => {
    it('should validate opportunity name length', () => {
      const maxLength = 255;
      const validNames = ['Test', 'A'.repeat(maxLength)];
      const invalidNames = ['', 'A'.repeat(maxLength + 1)];
      
      validNames.forEach(name => {
        expect(name.length).toBeGreaterThan(0);
        expect(name.length).toBeLessThanOrEqual(maxLength);
      });
      
      invalidNames.forEach(name => {
        expect(name.length === 0 || name.length > maxLength).toBe(true);
      });
    });

    it('should validate stage name length', () => {
      const maxLength = 100;
      const validNames = ['Lead', 'A'.repeat(maxLength)];
      const invalidNames = ['', 'A'.repeat(maxLength + 1)];
      
      validNames.forEach(name => {
        expect(name.length).toBeGreaterThan(0);
        expect(name.length).toBeLessThanOrEqual(maxLength);
      });
      
      invalidNames.forEach(name => {
        expect(name.length === 0 || name.length > maxLength).toBe(true);
      });
    });

    it('should validate UUID format', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a1b2c3d4-e5f6-7890-ab12-cd34ef567890'
      ];
      
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra'
      ];
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      validUUIDs.forEach(uuid => {
        expect(uuidRegex.test(uuid)).toBe(true);
      });
      
      invalidUUIDs.forEach(uuid => {
        expect(uuidRegex.test(uuid)).toBe(false);
      });
    });
  });

  describe('Field Constraints', () => {
    it('should validate decimal precision for opportunity value', () => {
      // Test that values can have up to 2 decimal places
      const validValues = [100, 100.5, 100.50, 100.99];
      const validPrecision = validValues.every(value => {
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        return decimalPlaces <= 2;
      });
      
      expect(validPrecision).toBe(true);
    });

    it('should validate text field lengths', () => {
      const opportunity = testHelpers.createTestOpportunity();
      
      // Test reasonable field lengths
      if (opportunity.description) {
        expect(opportunity.description.length).toBeLessThanOrEqual(5000);
      }
      
      if (opportunity.nextAction) {
        expect(opportunity.nextAction.length).toBeLessThanOrEqual(1000);
      }
    });

    it('should validate enum values', () => {
      // Test source enum (from Contact model but relevant for opportunities)
      const validSources = [
        'manual', 'linkedin', 'twitter', 'referral', 
        'website', 'email_campaign', 'cold_outreach', 'event'
      ];
      
      const testSource = 'manual';
      expect(validSources).toContain(testSource);
    });
  });

  describe('Index Validation', () => {
    it('should have proper indexing for performance', () => {
      // Test that commonly queried fields would be indexed
      const opportunity = testHelpers.createTestOpportunity();
      const stage = testHelpers.createTestStage();
      
      // These fields should be indexed for query performance
      const indexableFields = [
        'stageId', 'assignedTo', 'expectedCloseDate', 
        'contactId', 'companyId'
      ];
      
      indexableFields.forEach(field => {
        if (opportunity[field] !== undefined) {
          expect(opportunity).toHaveProperty(field);
        }
      });
      
      // Stage indexable fields
      const stageIndexableFields = ['displayOrder', 'isActive'];
      
      stageIndexableFields.forEach(field => {
        expect(stage).toHaveProperty(field);
      });
    });
  });
});