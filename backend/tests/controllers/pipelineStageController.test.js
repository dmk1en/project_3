const request = require('supertest');
const express = require('express');
const pipelineStageController = require('../../src/controllers/pipelineStageController');
const { PipelineStage, Opportunity, Activity } = require('../../src/models');

// Mock the models
jest.mock('../../src/models', () => ({
  PipelineStage: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    max: jest.fn(),
    sequelize: {
      fn: jest.fn(),
      col: jest.fn()
    }
  },
  Opportunity: {
    count: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn()
  },
  Activity: {
    bulkCreate: jest.fn(),
    findAll: jest.fn()
  }
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(mockAuth());

// Add routes
app.get('/pipeline-stages', pipelineStageController.getStages);
app.get('/pipeline-stages/analytics', pipelineStageController.getStageAnalytics);
app.get('/pipeline-stages/:id', pipelineStageController.getStageById);
app.post('/pipeline-stages', pipelineStageController.createStage);
app.put('/pipeline-stages/:id', pipelineStageController.updateStage);
app.delete('/pipeline-stages/:id', pipelineStageController.deleteStage);
app.put('/pipeline-stages/reorder', pipelineStageController.reorderStages);
app.put('/pipeline-stages/:id/toggle-status', pipelineStageController.toggleStageStatus);

describe('PipelineStageController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /pipeline-stages', () => {
    it('should return all active pipeline stages', async () => {
      const mockStages = [
        testHelpers.createTestStage(),
        { ...testHelpers.createTestStage(), id: 'stage-2', name: 'Qualified', displayOrder: 2 }
      ];

      PipelineStage.findAll.mockResolvedValue(mockStages);

      const response = await request(app)
        .get('/pipeline-stages')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(PipelineStage.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          order: [['displayOrder', 'ASC']]
        })
      );
    });

    it('should include inactive stages when requested', async () => {
      PipelineStage.findAll.mockResolvedValue([]);

      await request(app)
        .get('/pipeline-stages?includeInactive=true')
        .expect(200);

      expect(PipelineStage.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}
        })
      );
    });

    it('should include statistics when requested', async () => {
      PipelineStage.findAll.mockResolvedValue([]);

      await request(app)
        .get('/pipeline-stages?includeStats=true')
        .expect(200);

      expect(PipelineStage.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.any(Array)
        })
      );
    });
  });

  describe('GET /pipeline-stages/:id', () => {
    it('should return a single pipeline stage', async () => {
      const mockStage = {
        ...testHelpers.createTestStage(),
        opportunities: [testHelpers.createTestOpportunity()]
      };

      PipelineStage.findByPk.mockResolvedValue(mockStage);

      const response = await request(app)
        .get(`/pipeline-stages/${mockStage.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStage);
      expect(PipelineStage.findByPk).toHaveBeenCalledWith(
        mockStage.id,
        expect.objectContaining({
          include: expect.any(Array)
        })
      );
    });

    it('should return 404 for non-existent stage', async () => {
      PipelineStage.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .get('/pipeline-stages/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STAGE_NOT_FOUND');
    });
  });

  describe('POST /pipeline-stages', () => {
    it('should create a new pipeline stage', async () => {
      const stageData = {
        name: 'New Stage',
        probabilityPercent: 75,
        color: '#00FF00'
      };

      const createdStage = {
        id: 'new-stage-id',
        ...stageData,
        displayOrder: 6
      };

      PipelineStage.max.mockResolvedValue(5);
      PipelineStage.create.mockResolvedValue(createdStage);

      const response = await request(app)
        .post('/pipeline-stages')
        .send(stageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.displayOrder).toBe(6);
      expect(PipelineStage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...stageData,
          displayOrder: 6
        })
      );
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation error');
      error.name = 'SequelizeValidationError';
      error.errors = [
        { path: 'name', message: 'Name is required' }
      ];

      PipelineStage.max.mockResolvedValue(0);
      PipelineStage.create.mockRejectedValue(error);

      const response = await request(app)
        .post('/pipeline-stages')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /pipeline-stages/:id', () => {
    it('should update a pipeline stage', async () => {
      const stageId = testHelpers.createTestStage().id;
      const updateData = {
        name: 'Updated Stage',
        probabilityPercent: 80
      };

      const mockStage = {
        id: stageId,
        probabilityPercent: 50,
        update: jest.fn().mockResolvedValue()
      };

      PipelineStage.findByPk.mockResolvedValue(mockStage);
      Opportunity.update.mockResolvedValue([1]);

      const response = await request(app)
        .put(`/pipeline-stages/${stageId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockStage.update).toHaveBeenCalledWith(updateData);
      expect(Opportunity.update).toHaveBeenCalledWith(
        { probability: 80 },
        { where: { stageId } }
      );
    });

    it('should return 404 for non-existent stage', async () => {
      PipelineStage.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put('/pipeline-stages/nonexistent-id')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STAGE_NOT_FOUND');
    });
  });

  describe('DELETE /pipeline-stages/:id', () => {
    it('should delete a stage without opportunities', async () => {
      const stageId = testHelpers.createTestStage().id;
      
      const mockStage = {
        id: stageId,
        name: 'Test Stage',
        destroy: jest.fn().mockResolvedValue()
      };

      PipelineStage.findByPk.mockResolvedValue(mockStage);
      Opportunity.count.mockResolvedValue(0);

      const response = await request(app)
        .delete(`/pipeline-stages/${stageId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockStage.destroy).toHaveBeenCalled();
    });

    it('should require moveToStageId when stage has opportunities', async () => {
      const stageId = testHelpers.createTestStage().id;
      
      const mockStage = {
        id: stageId,
        name: 'Test Stage'
      };

      PipelineStage.findByPk.mockResolvedValue(mockStage);
      Opportunity.count.mockResolvedValue(5);

      const response = await request(app)
        .delete(`/pipeline-stages/${stageId}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STAGE_HAS_OPPORTUNITIES');
      expect(response.body.error.data.opportunityCount).toBe(5);
    });

    it('should move opportunities to target stage before deletion', async () => {
      const stageId = testHelpers.createTestStage().id;
      const targetStageId = 'target-stage-id';
      
      const mockStage = {
        id: stageId,
        name: 'Test Stage',
        destroy: jest.fn().mockResolvedValue()
      };

      const targetStage = {
        id: targetStageId,
        name: 'Target Stage',
        probabilityPercent: 75
      };

      PipelineStage.findByPk
        .mockResolvedValueOnce(mockStage)
        .mockResolvedValueOnce(targetStage);

      Opportunity.count.mockResolvedValue(3);
      Opportunity.update.mockResolvedValue([3]);
      Opportunity.findAll.mockResolvedValue([
        { id: 'opp-1', name: 'Opp 1', contactId: 'contact-1' },
        { id: 'opp-2', name: 'Opp 2', contactId: 'contact-2' },
        { id: 'opp-3', name: 'Opp 3', contactId: 'contact-3' }
      ]);
      Activity.bulkCreate.mockResolvedValue([]);

      const response = await request(app)
        .delete(`/pipeline-stages/${stageId}`)
        .send({ moveToStageId: targetStageId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.movedOpportunities).toBe(3);
      expect(Opportunity.update).toHaveBeenCalledWith(
        { 
          stageId: targetStageId,
          probability: 75
        },
        { where: { stageId } }
      );
      expect(Activity.bulkCreate).toHaveBeenCalled();
    });
  });

  describe('PUT /pipeline-stages/reorder', () => {
    it('should reorder pipeline stages', async () => {
      const stageIds = ['stage-1', 'stage-2', 'stage-3'];
      
      PipelineStage.update = jest.fn().mockResolvedValue([1]);
      PipelineStage.findAll.mockResolvedValue([
        { id: 'stage-1', displayOrder: 1 },
        { id: 'stage-2', displayOrder: 2 },
        { id: 'stage-3', displayOrder: 3 }
      ]);

      const response = await request(app)
        .put('/pipeline-stages/reorder')
        .send({ stageIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(PipelineStage.update).toHaveBeenCalledTimes(3);
    });

    it('should validate stageIds array', async () => {
      const response = await request(app)
        .put('/pipeline-stages/reorder')
        .send({ stageIds: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STAGE_IDS');
    });
  });

  describe('PUT /pipeline-stages/:id/toggle-status', () => {
    it('should activate an inactive stage', async () => {
      const stageId = testHelpers.createTestStage().id;
      
      const mockStage = {
        id: stageId,
        isActive: false,
        update: jest.fn().mockImplementation(function(data) {
          this.isActive = data.isActive;
          return Promise.resolve();
        })
      };

      PipelineStage.findByPk.mockResolvedValue(mockStage);

      const response = await request(app)
        .put(`/pipeline-stages/${stageId}/toggle-status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('activated');
      expect(mockStage.update).toHaveBeenCalledWith({ isActive: true });
    });

    it('should prevent deactivating stage with opportunities', async () => {
      const stageId = testHelpers.createTestStage().id;
      
      const mockStage = {
        id: stageId,
        isActive: true
      };

      PipelineStage.findByPk.mockResolvedValue(mockStage);
      Opportunity.count.mockResolvedValue(2);

      const response = await request(app)
        .put(`/pipeline-stages/${stageId}/toggle-status`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STAGE_HAS_OPPORTUNITIES');
    });
  });

  describe('GET /pipeline-stages/analytics', () => {
    it('should return stage analytics', async () => {
      Activity.findAll.mockResolvedValue([
        {
          createdAt: new Date(),
          subject: 'Stage changed from Lead to Qualified',
          opportunity: { id: 'opp-1', name: 'Test Opp', value: 10000 }
        }
      ]);

      PipelineStage.findAll.mockResolvedValue([
        { id: 'stage-1', name: 'Lead', displayOrder: 1 }
      ]);

      const response = await request(app)
        .get('/pipeline-stages/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stages).toBeDefined();
      expect(response.body.data.totalOpportunities).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      PipelineStage.findAll.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/pipeline-stages')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});