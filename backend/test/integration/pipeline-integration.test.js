const request = require('supertest');
const app = require('../../src/app');
const { User, Contact, Company, Opportunity, PipelineStage } = require('../../src/models');
const jwt = require('jsonwebtoken');

describe('Pipeline Integration Tests', () => {
  let authToken;
  let testUser;
  let testCompany;
  let testContact;
  let testStages;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: 'pipeline.test@example.com',
      password: 'hashedpassword123',
      firstName: 'Pipeline',
      lastName: 'Tester',
      role: 'sales_rep'
    });

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test company
    testCompany = await Company.create({
      name: 'Test Pipeline Company',
      industry: 'Technology',
      size: '50-200',
      website: 'https://testpipeline.com'
    });

    // Create test contact
    testContact = await Contact.create({
      firstName: 'John',
      lastName: 'Pipeline',
      email: 'john.pipeline@testcompany.com',
      phone: '+1-555-0123',
      companyId: testCompany.id,
      leadStatus: 'qualified',
      source: 'manual_entry'
    });

    // Get pipeline stages
    testStages = await PipelineStage.findAll({
      order: [['order', 'ASC']]
    });
  });

  afterAll(async () => {
    // Clean up test data
    await Opportunity.destroy({ where: { contactId: testContact.id } });
    await Contact.destroy({ where: { id: testContact.id } });
    await Company.destroy({ where: { id: testCompany.id } });
    await User.destroy({ where: { id: testUser.id } });
  });

  describe('Complete Pipeline Workflow', () => {
    let testOpportunity;

    test('Should create opportunity in initial stage', async () => {
      const opportunityData = {
        title: 'Pipeline Integration Test Deal',
        description: 'Testing complete pipeline workflow',
        value: 50000,
        currency: 'USD',
        expectedCloseDate: '2024-03-01',
        contactId: testContact.id,
        companyId: testCompany.id,
        stageId: testStages[0].id // First stage
      };

      const response = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(opportunityData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(opportunityData.title);
      expect(response.body.stage).toHaveProperty('name');
      
      testOpportunity = response.body;
    });

    test('Should get Kanban view with opportunity', async () => {
      const response = await request(app)
        .get('/api/opportunities/kanban')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Find our test stage
      const testStageKanban = response.body.find(stage => 
        stage.id === testStages[0].id
      );
      
      expect(testStageKanban).toBeDefined();
      expect(testStageKanban.opportunities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: testOpportunity.id,
            title: testOpportunity.title
          })
        ])
      );
    });

    test('Should move opportunity through pipeline stages', async () => {
      // Move to second stage
      const nextStage = testStages[1];
      
      const moveResponse = await request(app)
        .put(`/api/opportunities/${testOpportunity.id}/stage`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stageId: nextStage.id });

      expect(moveResponse.status).toBe(200);
      expect(moveResponse.body.stageId).toBe(nextStage.id);
      expect(moveResponse.body.stage.name).toBe(nextStage.name);

      // Verify opportunity was moved
      const checkResponse = await request(app)
        .get(`/api/opportunities/${testOpportunity.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkResponse.status).toBe(200);
      expect(checkResponse.body.stageId).toBe(nextStage.id);
    });

    test('Should track activities when moving stages', async () => {
      // Move to third stage
      const thirdStage = testStages[2];
      
      await request(app)
        .put(`/api/opportunities/${testOpportunity.id}/stage`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stageId: thirdStage.id });

      // Get opportunity activities
      const response = await request(app)
        .get(`/api/opportunities/${testOpportunity.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activities');
      expect(Array.isArray(response.body.activities)).toBe(true);
      
      // Should have stage movement activities
      const stageMovements = response.body.activities.filter(
        activity => activity.type === 'stage_change'
      );
      expect(stageMovements.length).toBeGreaterThanOrEqual(2);
    });

    test('Should get pipeline analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/pipeline')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalOpportunities');
      expect(response.body).toHaveProperty('totalValue');
      expect(response.body).toHaveProperty('stageDistribution');
      expect(response.body).toHaveProperty('conversionRates');
      
      expect(response.body.totalOpportunities).toBeGreaterThanOrEqual(1);
      expect(response.body.totalValue).toBeGreaterThanOrEqual(50000);
      expect(Array.isArray(response.body.stageDistribution)).toBe(true);
    });

    test('Should get pipeline forecasting', async () => {
      const response = await request(app)
        .get('/api/analytics/pipeline/forecast')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('forecast');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('breakdown');
      
      expect(Array.isArray(response.body.breakdown)).toBe(true);
      expect(typeof response.body.forecast).toBe('number');
      expect(response.body.confidence).toBeGreaterThanOrEqual(0);
      expect(response.body.confidence).toBeLessThanOrEqual(100);
    });

    test('Should filter opportunities by stage', async () => {
      const currentStageId = testStages[2].id; // Third stage where we moved
      
      const response = await request(app)
        .get(`/api/opportunities?stageId=${currentStageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('opportunities');
      expect(Array.isArray(response.body.opportunities)).toBe(true);
      
      // Should include our test opportunity
      const foundOpportunity = response.body.opportunities.find(
        opp => opp.id === testOpportunity.id
      );
      expect(foundOpportunity).toBeDefined();
      expect(foundOpportunity.stageId).toBe(currentStageId);
    });

    test('Should update opportunity value and track changes', async () => {
      const newValue = 75000;
      
      const response = await request(app)
        .put(`/api/opportunities/${testOpportunity.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ value: newValue });

      expect(response.status).toBe(200);
      expect(response.body.value).toBe(newValue);

      // Check analytics reflects the change
      const analyticsResponse = await request(app)
        .get('/api/analytics/pipeline')
        .set('Authorization', `Bearer ${authToken}`);

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.totalValue).toBeGreaterThanOrEqual(newValue);
    });
  });

  describe('Pipeline Stage Management', () => {
    test('Should get all pipeline stages', async () => {
      const response = await request(app)
        .get('/api/pipeline-stages')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check stage structure
      response.body.forEach(stage => {
        expect(stage).toHaveProperty('id');
        expect(stage).toHaveProperty('name');
        expect(stage).toHaveProperty('order');
        expect(stage).toHaveProperty('probability');
      });
    });

    test('Should get stage analytics', async () => {
      const stageId = testStages[0].id;
      
      const response = await request(app)
        .get(`/api/pipeline-stages/${stageId}/analytics`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalOpportunities');
      expect(response.body).toHaveProperty('totalValue');
      expect(response.body).toHaveProperty('averageValue');
      expect(response.body).toHaveProperty('averageTimeInStage');
      
      expect(typeof response.body.totalOpportunities).toBe('number');
      expect(typeof response.body.totalValue).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid opportunity creation', async () => {
      const invalidData = {
        title: '', // Invalid: empty title
        value: -1000, // Invalid: negative value
        contactId: 'invalid-uuid'
      };

      const response = await request(app)
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    test('Should handle moving to non-existent stage', async () => {
      const response = await request(app)
        .put(`/api/opportunities/${testOpportunity.id}/stage`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stageId: 'non-existent-uuid' });

      expect(response.status).toBe(404);
    });

    test('Should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/opportunities')
        // No authorization header
        
      expect(response.status).toBe(401);
    });
  });

  describe('Data Consistency', () => {
    test('Should maintain referential integrity', async () => {
      // Get opportunity with all relations
      const response = await request(app)
        .get(`/api/opportunities/${testOpportunity.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      const opportunity = response.body;
      expect(opportunity).toHaveProperty('contact');
      expect(opportunity).toHaveProperty('company');
      expect(opportunity).toHaveProperty('stage');
      expect(opportunity).toHaveProperty('assignedUser');
      
      // Verify IDs match
      expect(opportunity.contactId).toBe(testContact.id);
      expect(opportunity.companyId).toBe(testCompany.id);
      expect(opportunity.assignedTo).toBe(testUser.id);
    });

    test('Should handle cascading updates', async () => {
      // Update contact name
      await Contact.update(
        { firstName: 'Updated', lastName: 'Name' },
        { where: { id: testContact.id } }
      );

      // Get opportunity and verify contact data is updated
      const response = await request(app)
        .get(`/api/opportunities/${testOpportunity.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.contact.firstName).toBe('Updated');
      expect(response.body.contact.lastName).toBe('Name');
    });
  });
});