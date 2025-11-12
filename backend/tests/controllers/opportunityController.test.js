const request = require('supertest');
const express = require('express');
const opportunityController = require('../../src/controllers/opportunityController');
const { Opportunity, Contact, Company, PipelineStage, User, Activity } = require('../../src/models');

// Mock the models properly
const mockModels = {
  Opportunity: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn()
  },
  Contact: {
    findByPk: jest.fn()
  },
  Company: {
    findByPk: jest.fn()
  },
  PipelineStage: {
    findAll: jest.fn(),
    findByPk: jest.fn()
  },
  User: {
    findByPk: jest.fn()
  },
  Activity: {
    findOne: jest.fn(),
    create: jest.fn()
  }
};

jest.mock('../../src/models', () => mockModels);

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(mockAuth());

// Add routes
app.get('/opportunities', opportunityController.getOpportunities);
app.get('/opportunities/by-stage', opportunityController.getOpportunitiesByStage);
app.get('/opportunities/:id', opportunityController.getOpportunityById);
app.post('/opportunities', opportunityController.createOpportunity);
app.put('/opportunities/:id', opportunityController.updateOpportunity);
app.delete('/opportunities/:id', opportunityController.deleteOpportunity);
app.put('/opportunities/:id/stage', opportunityController.moveToStage);

describe('OpportunityController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock implementations
    Object.values(mockModels).forEach(model => {
      Object.values(model).forEach(method => {
        if (typeof method === 'function' && method.mockReset) {
          method.mockReset();
        }
      });
    });
  });

  afterAll((done) => {
    // Clean up and force close
    setTimeout(() => {
      done();
    }, 100);
  });

  describe('GET /opportunities', () => {
    it('should return opportunities with pagination', async () => {
      const mockOpportunities = [testHelpers.createTestOpportunity()];
      
      Opportunity.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockOpportunities.map(opp => ({
          ...opp,
          toJSON: () => opp
        }))
      });

      Activity.findOne.mockResolvedValue({
        type: 'note',
        subject: 'Test activity',
        createdAt: new Date()
      });

      const response = await request(app)
        .get('/opportunities')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.opportunities).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
      expect(Opportunity.findAndCountAll).toHaveBeenCalled();
    });

    it('should filter opportunities by search term', async () => {
      Opportunity.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: []
      });

      await request(app)
        .get('/opportunities?search=test')
        .expect(200);

      expect(Opportunity.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [Symbol.for('or')]: expect.any(Array)
          })
        })
      );
    });

    it('should filter opportunities by stage', async () => {
      const stageId = testHelpers.createTestStage().id;
      
      Opportunity.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: []
      });

      await request(app)
        .get(`/opportunities?stageId=${stageId}`)
        .expect(200);

      expect(Opportunity.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stageId: stageId
          })
        })
      );
    });
  });

  describe('GET /opportunities/by-stage', () => {
    it('should return opportunities grouped by stage', async () => {
      const mockStages = [testHelpers.createTestStage()];
      
      PipelineStage.findAll.mockResolvedValue(mockStages.map(stage => ({
        ...stage,
        opportunities: [testHelpers.createTestOpportunity()],
        toJSON: () => ({ ...stage, opportunities: [testHelpers.createTestOpportunity()] })
      })));

      const response = await request(app)
        .get('/opportunities/by-stage')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].stats).toBeDefined();
      expect(PipelineStage.findAll).toHaveBeenCalled();
    });
  });

  describe('GET /opportunities/:id', () => {
    it('should return a single opportunity', async () => {
      const mockOpportunity = testHelpers.createTestOpportunity();
      
      Opportunity.findByPk.mockResolvedValue(mockOpportunity);

      const response = await request(app)
        .get(`/opportunities/${mockOpportunity.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockOpportunity);
      expect(Opportunity.findByPk).toHaveBeenCalledWith(mockOpportunity.id, expect.any(Object));
    });

    it('should return 404 for non-existent opportunity', async () => {
      Opportunity.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/opportunities/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('OPPORTUNITY_NOT_FOUND');
    });
  });

  describe('POST /opportunities', () => {
    it('should create a new opportunity', async () => {
      const opportunityData = {
        name: 'New Opportunity',
        contactId: testHelpers.createTestContact().id,
        stageId: testHelpers.createTestStage().id,
        value: 15000
      };

      const createdOpportunity = {
        id: 'new-opportunity-id',
        ...opportunityData
      };

      Opportunity.create.mockResolvedValue(createdOpportunity);
      Opportunity.findByPk.mockResolvedValue(createdOpportunity);
      Activity.create.mockResolvedValue({});

      const response = await request(app)
        .post('/opportunities')
        .send(opportunityData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(opportunityData.name);
      expect(Opportunity.create).toHaveBeenCalledWith(
        expect.objectContaining(opportunityData)
      );
      expect(Activity.create).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation error');
      error.name = 'SequelizeValidationError';
      error.errors = [
        { path: 'name', message: 'Name is required' }
      ];

      Opportunity.create.mockRejectedValue(error);

      const response = await request(app)
        .post('/opportunities')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveLength(1);
    });
  });

  describe('PUT /opportunities/:id', () => {
    it('should update an opportunity', async () => {
      const opportunityId = testHelpers.createTestOpportunity().id;
      const updateData = { name: 'Updated Opportunity' };
      
      const mockOpportunity = {
        id: opportunityId,
        stageId: 'stage-1',
        update: jest.fn().mockResolvedValue()
      };

      Opportunity.findByPk
        .mockResolvedValueOnce(mockOpportunity)
        .mockResolvedValueOnce({ ...mockOpportunity, ...updateData });

      const response = await request(app)
        .put(`/opportunities/${opportunityId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockOpportunity.update).toHaveBeenCalledWith(updateData);
    });

    it('should create activity when stage changes', async () => {
      const opportunityId = testHelpers.createTestOpportunity().id;
      const updateData = { stageId: 'new-stage-id' };
      
      const mockOpportunity = {
        id: opportunityId,
        name: 'Test Opportunity',
        stageId: 'old-stage-id',
        contactId: 'contact-id',
        update: jest.fn().mockResolvedValue()
      };

      Opportunity.findByPk
        .mockResolvedValueOnce(mockOpportunity)
        .mockResolvedValueOnce({ ...mockOpportunity, ...updateData });

      PipelineStage.findByPk
        .mockResolvedValueOnce({ name: 'Old Stage' })
        .mockResolvedValueOnce({ name: 'New Stage' });

      Activity.create.mockResolvedValue({});

      await request(app)
        .put(`/opportunities/${opportunityId}`)
        .send(updateData)
        .expect(200);

      expect(Activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stage_change'
        })
      );
    });
  });

  describe('DELETE /opportunities/:id', () => {
    it('should delete an opportunity', async () => {
      const opportunityId = testHelpers.createTestOpportunity().id;
      
      const mockOpportunity = {
        id: opportunityId,
        name: 'Test Opportunity',
        contactId: 'contact-id',
        destroy: jest.fn().mockResolvedValue()
      };

      Opportunity.findByPk.mockResolvedValue(mockOpportunity);
      Activity.create.mockResolvedValue({});

      const response = await request(app)
        .delete(`/opportunities/${opportunityId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockOpportunity.destroy).toHaveBeenCalled();
      expect(Activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'note',
          subject: expect.stringContaining('deleted')
        })
      );
    });

    it('should return 404 for non-existent opportunity', async () => {
      Opportunity.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .delete('/opportunities/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('OPPORTUNITY_NOT_FOUND');
    });
  });

  describe('PUT /opportunities/:id/stage', () => {
    it('should move opportunity to new stage', async () => {
      const opportunityId = testHelpers.createTestOpportunity().id;
      const newStageId = 'new-stage-id';
      
      const mockOpportunity = {
        id: opportunityId,
        name: 'Test Opportunity',
        contactId: 'contact-id',
        stage: { name: 'Old Stage' },
        update: jest.fn().mockResolvedValue()
      };

      const newStage = {
        id: newStageId,
        name: 'New Stage',
        probabilityPercent: 50
      };

      Opportunity.findByPk
        .mockResolvedValueOnce(mockOpportunity)
        .mockResolvedValueOnce({ ...mockOpportunity, stageId: newStageId });

      PipelineStage.findByPk.mockResolvedValue(newStage);
      Activity.create.mockResolvedValue({});

      const response = await request(app)
        .put(`/opportunities/${opportunityId}/stage`)
        .send({ stageId: newStageId, notes: 'Moving to qualification' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockOpportunity.update).toHaveBeenCalledWith({
        stageId: newStageId,
        probability: 50
      });
      expect(Activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stage_change',
          description: 'Moving to qualification'
        })
      );
    });

    it('should return 404 for invalid stage', async () => {
      const opportunityId = testHelpers.createTestOpportunity().id;
      
      Opportunity.findByPk.mockResolvedValue(testHelpers.createTestOpportunity());
      PipelineStage.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put(`/opportunities/${opportunityId}/stage`)
        .send({ stageId: 'invalid-stage-id' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STAGE_NOT_FOUND');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      Opportunity.findAndCountAll.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/opportunities')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});