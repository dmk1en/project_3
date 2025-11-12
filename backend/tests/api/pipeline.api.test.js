const request = require('supertest');
const express = require('express');
const { sequelize } = require('../../src/config/db');
const app = require('../../src/app');

// Test database setup
const testDb = {
  async setup() {
    // Create test database tables
    await sequelize.sync({ force: true });
    
    // Create test user for authentication
    const { User, Company, Contact, PipelineStage } = require('../../src/models');
    
    this.testUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: '$2a$10$example.hashed.password', // bcrypt hash for 'password'
      role: 'sales_rep'
    });

    this.testCompany = await Company.create({
      name: 'Test Company',
      industry: 'Technology',
      size: '50-200'
    });

    this.testContact = await Contact.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      companyId: this.testCompany.id,
      source: 'manual',
      leadStatus: 'new',
      assignedTo: this.testUser.id
    });

    // Create pipeline stages
    this.testStages = await PipelineStage.bulkCreate([
      { name: 'Lead', displayOrder: 1, probabilityPercent: 10, color: '#FF6B6B', isActive: true },
      { name: 'Qualified', displayOrder: 2, probabilityPercent: 25, color: '#4ECDC4', isActive: true },
      { name: 'Proposal', displayOrder: 3, probabilityPercent: 50, color: '#45B7D1', isActive: true },
      { name: 'Negotiation', displayOrder: 4, probabilityPercent: 75, color: '#96CEB4', isActive: true },
      { name: 'Closed Won', displayOrder: 5, probabilityPercent: 100, color: '#FFEAA7', isActive: true },
      { name: 'Closed Lost', displayOrder: 6, probabilityPercent: 0, color: '#DDA0DD', isActive: true }
    ]);

    // Generate JWT token for authentication
    const jwt = require('jsonwebtoken');
    this.authToken = jwt.sign(
      { userId: this.testUser.id, role: this.testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  },

  async cleanup() {
    // Clean up test data
    await sequelize.drop();
    await sequelize.close();
  }
};

describe('Pipeline API Endpoints', () => {
  beforeAll(async () => {
    await testDb.setup();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('Pipeline Stages API', () => {
    describe('GET /api/v1/pipeline-stages', () => {
      it('should return all active pipeline stages', async () => {
        const response = await request(app)
          .get('/api/v1/pipeline-stages')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(6);
        expect(response.body.data[0]).toHaveProperty('name');
        expect(response.body.data[0]).toHaveProperty('displayOrder');
        expect(response.body.data[0]).toHaveProperty('probabilityPercent');
        expect(response.body.data[0]).toHaveProperty('color');
      });

      it('should include inactive stages when requested', async () => {
        // First deactivate a stage
        await request(app)
          .put(`/api/v1/pipeline-stages/${testDb.testStages[0].id}/toggle-status`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .expect(200);

        const response = await request(app)
          .get('/api/v1/pipeline-stages?includeInactive=true')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(6); // Still 6, but one inactive
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/v1/pipeline-stages')
          .expect(401);
      });
    });

    describe('POST /api/v1/pipeline-stages', () => {
      it('should create a new pipeline stage', async () => {
        const stageData = {
          name: 'Demo Scheduled',
          probabilityPercent: 35,
          color: '#FFA500'
        };

        const response = await request(app)
          .post('/api/v1/pipeline-stages')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send(stageData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(stageData.name);
        expect(response.body.data.probabilityPercent).toBe(stageData.probabilityPercent);
        expect(response.body.data.color).toBe(stageData.color);
        expect(response.body.data.displayOrder).toBe(7); // Should be next in order
        expect(response.body.data.isActive).toBe(true);
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/v1/pipeline-stages')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should validate probability percentage range', async () => {
        const invalidData = {
          name: 'Invalid Stage',
          probabilityPercent: 150 // Invalid - over 100
        };

        const response = await request(app)
          .post('/api/v1/pipeline-stages')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate hex color format', async () => {
        const invalidData = {
          name: 'Invalid Color Stage',
          color: 'not-a-color'
        };

        const response = await request(app)
          .post('/api/v1/pipeline-stages')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/v1/pipeline-stages/:id', () => {
      it('should update a pipeline stage', async () => {
        const updateData = {
          name: 'Updated Lead Stage',
          probabilityPercent: 15,
          color: '#FF0000'
        };

        const response = await request(app)
          .put(`/api/v1/pipeline-stages/${testDb.testStages[0].id}`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(updateData.name);
        expect(response.body.data.probabilityPercent).toBe(updateData.probabilityPercent);
      });

      it('should return 404 for non-existent stage', async () => {
        const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';
        
        const response = await request(app)
          .put(`/api/v1/pipeline-stages/${nonExistentId}`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send({ name: 'Updated' })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('STAGE_NOT_FOUND');
      });
    });

    describe('PUT /api/v1/pipeline-stages/reorder', () => {
      it('should reorder pipeline stages', async () => {
        const stageIds = testDb.testStages.map(stage => stage.id).reverse();

        const response = await request(app)
          .put('/api/v1/pipeline-stages/reorder')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send({ stageIds })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(stageIds.length);
      });

      it('should validate stageIds array', async () => {
        const response = await request(app)
          .put('/api/v1/pipeline-stages/reorder')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send({ stageIds: [] })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Opportunities API', () => {
    let testOpportunity;

    beforeAll(async () => {
      // Create a test opportunity
      const { Opportunity } = require('../../src/models');
      testOpportunity = await Opportunity.create({
        name: 'Test API Opportunity',
        contactId: testDb.testContact.id,
        companyId: testDb.testCompany.id,
        stageId: testDb.testStages[0].id,
        assignedTo: testDb.testUser.id,
        value: 25000,
        currency: 'USD',
        expectedCloseDate: '2025-12-31',
        description: 'Test opportunity for API testing'
      });
    });

    describe('GET /api/v1/opportunities', () => {
      it('should return opportunities with pagination', async () => {
        const response = await request(app)
          .get('/api/v1/opportunities')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.opportunities).toBeInstanceOf(Array);
        expect(response.body.data.opportunities.length).toBeGreaterThan(0);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination).toHaveProperty('currentPage');
        expect(response.body.data.pagination).toHaveProperty('totalPages');
        expect(response.body.data.pagination).toHaveProperty('totalItems');
      });

      it('should filter opportunities by search term', async () => {
        const response = await request(app)
          .get('/api/v1/opportunities?search=Test API')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.opportunities.length).toBeGreaterThan(0);
        expect(response.body.data.opportunities[0].name).toContain('Test API');
      });

      it('should filter opportunities by stage', async () => {
        const stageId = testDb.testStages[0].id;
        
        const response = await request(app)
          .get(`/api/v1/opportunities?stageId=${stageId}`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.opportunities.forEach(opp => {
          expect(opp.stageId || opp.stage?.id).toBe(stageId);
        });
      });

      it('should handle pagination parameters', async () => {
        const response = await request(app)
          .get('/api/v1/opportunities?page=1&limit=5')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.pagination.currentPage).toBe(1);
        expect(response.body.data.pagination.itemsPerPage).toBe(5);
      });
    });

    describe('GET /api/v1/opportunities/by-stage', () => {
      it('should return opportunities grouped by stage', async () => {
        const response = await request(app)
          .get('/api/v1/opportunities/by-stage')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        
        // Each stage should have stats
        response.body.data.forEach(stage => {
          expect(stage).toHaveProperty('id');
          expect(stage).toHaveProperty('name');
          expect(stage).toHaveProperty('stats');
          expect(stage.stats).toHaveProperty('count');
          expect(stage.stats).toHaveProperty('totalValue');
        });
      });
    });

    describe('GET /api/v1/opportunities/:id', () => {
      it('should return a single opportunity', async () => {
        const response = await request(app)
          .get(`/api/v1/opportunities/${testOpportunity.id}`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testOpportunity.id);
        expect(response.body.data.name).toBe(testOpportunity.name);
        expect(response.body.data.value).toBe('25000.00'); // Decimal string
      });

      it('should return 404 for non-existent opportunity', async () => {
        const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';
        
        const response = await request(app)
          .get(`/api/v1/opportunities/${nonExistentId}`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('OPPORTUNITY_NOT_FOUND');
      });
    });

    describe('POST /api/v1/opportunities', () => {
      it('should create a new opportunity', async () => {
        const opportunityData = {
          name: 'New API Test Opportunity',
          contactId: testDb.testContact.id,
          companyId: testDb.testCompany.id,
          stageId: testDb.testStages[1].id, // Qualified stage
          value: 15000,
          currency: 'USD',
          expectedCloseDate: '2025-11-30',
          description: 'Another test opportunity'
        };

        const response = await request(app)
          .post('/api/v1/opportunities')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send(opportunityData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(opportunityData.name);
        expect(response.body.data.contactId).toBe(opportunityData.contactId);
        expect(response.body.data.stageId).toBe(opportunityData.stageId);
        expect(response.body.data.assignedTo).toBe(testDb.testUser.id); // Should auto-assign
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/v1/opportunities')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });

      it('should validate UUID fields', async () => {
        const invalidData = {
          name: 'Test Opportunity',
          contactId: 'invalid-uuid',
          stageId: testDb.testStages[0].id
        };

        const response = await request(app)
          .post('/api/v1/opportunities')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate value is positive', async () => {
        const invalidData = {
          name: 'Test Opportunity',
          contactId: testDb.testContact.id,
          stageId: testDb.testStages[0].id,
          value: -1000 // Negative value
        };

        const response = await request(app)
          .post('/api/v1/opportunities')
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/v1/opportunities/:id', () => {
      it('should update an opportunity', async () => {
        const updateData = {
          name: 'Updated API Test Opportunity',
          value: 30000,
          description: 'Updated description'
        };

        const response = await request(app)
          .put(`/api/v1/opportunities/${testOpportunity.id}`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(updateData.name);
        expect(response.body.data.value).toBe('30000.00');
      });

      it('should return 404 for non-existent opportunity', async () => {
        const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';
        
        const response = await request(app)
          .put(`/api/v1/opportunities/${nonExistentId}`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send({ name: 'Updated' })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('OPPORTUNITY_NOT_FOUND');
      });
    });

    describe('PUT /api/v1/opportunities/:id/stage', () => {
      it('should move opportunity to new stage', async () => {
        const newStageId = testDb.testStages[2].id; // Proposal stage
        const stageData = {
          stageId: newStageId,
          notes: 'Moving to proposal stage for API test'
        };

        const response = await request(app)
          .put(`/api/v1/opportunities/${testOpportunity.id}/stage`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send(stageData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.stageId).toBe(newStageId);
        expect(response.body.data.probability).toBe(testDb.testStages[2].probabilityPercent);
      });

      it('should return 404 for invalid stage', async () => {
        const invalidStageId = '123e4567-e89b-12d3-a456-426614174999';
        
        const response = await request(app)
          .put(`/api/v1/opportunities/${testOpportunity.id}/stage`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send({ stageId: invalidStageId })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('STAGE_NOT_FOUND');
      });

      it('should validate required stageId', async () => {
        const response = await request(app)
          .put(`/api/v1/opportunities/${testOpportunity.id}/stage`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/v1/opportunities/:id', () => {
      it('should delete an opportunity', async () => {
        // Create a new opportunity for deletion test
        const { Opportunity } = require('../../src/models');
        const opportunityToDelete = await Opportunity.create({
          name: 'Opportunity to Delete',
          contactId: testDb.testContact.id,
          stageId: testDb.testStages[0].id,
          assignedTo: testDb.testUser.id,
          value: 5000
        });

        const response = await request(app)
          .delete(`/api/v1/opportunities/${opportunityToDelete.id}`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted');

        // Verify it's actually deleted
        const deletedCheck = await request(app)
          .get(`/api/v1/opportunities/${opportunityToDelete.id}`)
          .set('Authorization', `Bearer ${testDb.authToken}`)
          .expect(404);
      });
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication token', async () => {
      await request(app)
        .get('/api/v1/opportunities')
        .expect(401);

      await request(app)
        .get('/api/v1/pipeline-stages')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app)
        .get('/api/v1/opportunities')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle expired tokens', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: testDb.testUser.id, role: testDb.testUser.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Already expired
      );

      await request(app)
        .get('/api/v1/opportunities')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/v1/opportunities')
        .set('Authorization', `Bearer ${testDb.authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle invalid UUID parameters', async () => {
      await request(app)
        .get('/api/v1/opportunities/invalid-uuid')
        .set('Authorization', `Bearer ${testDb.authToken}`)
        .expect(400);
    });

    it('should handle server errors gracefully', async () => {
      // This test would require mocking database errors
      // For now, we just verify error response format
      const response = await request(app)
        .get('/api/v1/opportunities/123e4567-e89b-12d3-a456-426614174999')
        .set('Authorization', `Bearer ${testDb.authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });
});