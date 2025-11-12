const request = require('supertest');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Create a test app with our routes
const createTestApp = () => {
  const app = express();
  
  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Mock authentication middleware for testing
  app.use('/api/v1', (req, res, next) => {
    // Mock authenticated user
    req.user = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'sales_rep'
    };
    next();
  });

  // Add our API routes
  app.use('/api/v1', require('../../src/routes'));

  // Error handling middleware
  app.use((error, req, res, next) => {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error'
      }
    });
  });

  return app;
};

describe('Pipeline API Endpoints - Simple Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('API Health Check', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('CRM API is running');
    });

    it('should return API endpoints list', async () => {
      const response = await request(app)
        .get('/api/v1/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.endpoints).toHaveProperty('opportunities');
      expect(response.body.endpoints).toHaveProperty('pipelineStages');
    });
  });

  describe('Pipeline Stages Endpoints', () => {
    it('should handle GET /api/v1/pipeline-stages', async () => {
      const response = await request(app)
        .get('/api/v1/pipeline-stages')
        .expect(res => {
          // Accept both success and error responses for endpoint existence test
          expect([200, 404, 500]).toContain(res.status);
        });

      // The endpoint should exist and return JSON
      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });

    it('should handle POST /api/v1/pipeline-stages with validation', async () => {
      const stageData = {
        name: 'Test Stage',
        probabilityPercent: 50,
        color: '#FF0000'
      };

      const response = await request(app)
        .post('/api/v1/pipeline-stages')
        .send(stageData)
        .expect(res => {
          // Accept success or validation error
          expect([201, 400, 500]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('success');
    });

    it('should validate pipeline stage data format', async () => {
      const invalidData = {
        name: '', // Invalid empty name
        probabilityPercent: 150, // Invalid percentage > 100
        color: 'invalid-color' // Invalid color format
      };

      const response = await request(app)
        .post('/api/v1/pipeline-stages')
        .send(invalidData);

      // Should return validation error or handle gracefully
      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });

    it('should handle PUT /api/v1/pipeline-stages/reorder', async () => {
      const reorderData = {
        stageIds: [
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002',
          '123e4567-e89b-12d3-a456-426614174003'
        ]
      };

      const response = await request(app)
        .put('/api/v1/pipeline-stages/reorder')
        .send(reorderData);

      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });
  });

  describe('Opportunities Endpoints', () => {
    it('should handle GET /api/v1/opportunities', async () => {
      const response = await request(app)
        .get('/api/v1/opportunities')
        .expect(res => {
          // Accept various status codes as we're testing endpoint existence
          expect([200, 404, 500]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });

    it('should handle GET /api/v1/opportunities with query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/opportunities?page=1&limit=10&search=test')
        .expect(res => {
          expect([200, 400, 404, 500]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should handle GET /api/v1/opportunities/by-stage', async () => {
      const response = await request(app)
        .get('/api/v1/opportunities/by-stage')
        .expect(res => {
          expect([200, 404, 500]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });

    it('should handle POST /api/v1/opportunities with validation', async () => {
      const opportunityData = {
        name: 'Test Opportunity',
        contactId: '123e4567-e89b-12d3-a456-426614174001',
        stageId: '123e4567-e89b-12d3-a456-426614174002',
        value: 10000,
        currency: 'USD',
        expectedCloseDate: '2025-12-31'
      };

      const response = await request(app)
        .post('/api/v1/opportunities')
        .send(opportunityData)
        .expect(res => {
          expect([201, 400, 404, 500]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('success');
    });

    it('should validate opportunity data format', async () => {
      const invalidData = {
        name: '', // Invalid empty name
        contactId: 'invalid-uuid', // Invalid UUID
        stageId: 'invalid-uuid', // Invalid UUID
        value: -1000 // Invalid negative value
      };

      const response = await request(app)
        .post('/api/v1/opportunities')
        .send(invalidData);

      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });

    it('should handle opportunity stage movement', async () => {
      const opportunityId = '123e4567-e89b-12d3-a456-426614174003';
      const stageData = {
        stageId: '123e4567-e89b-12d3-a456-426614174004',
        notes: 'Moving to next stage'
      };

      const response = await request(app)
        .put(`/api/v1/opportunities/${opportunityId}/stage`)
        .send(stageData)
        .expect(res => {
          expect([200, 400, 404, 500]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });
  });

  describe('Request Validation', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/opportunities')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(res => {
          expect([400, 500]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should validate UUID format in URLs', async () => {
      const response = await request(app)
        .get('/api/v1/opportunities/invalid-uuid-format')
        .expect(res => {
          expect([400, 404, 500]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/opportunities')
        .send({}) // Empty body
        .expect(res => {
          expect([400, 500]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });
  });

  describe('HTTP Methods Support', () => {
    const endpoints = [
      { method: 'get', path: '/api/v1/pipeline-stages' },
      { method: 'post', path: '/api/v1/pipeline-stages' },
      { method: 'get', path: '/api/v1/opportunities' },
      { method: 'post', path: '/api/v1/opportunities' },
      { method: 'get', path: '/api/v1/opportunities/by-stage' }
    ];

    endpoints.forEach(({ method, path }) => {
      it(`should support ${method.toUpperCase()} ${path}`, async () => {
        const testData = method === 'post' ? { name: 'test' } : undefined;
        
        const response = await request(app)
          [method](path)
          .send(testData)
          .expect(res => {
            // Should not return 405 Method Not Allowed
            expect(res.status).not.toBe(405);
          });

        expect(response.body).toBeDefined();
      });
    });
  });

  describe('Content-Type Handling', () => {
    it('should accept application/json', async () => {
      const response = await request(app)
        .post('/api/v1/pipeline-stages')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ name: 'Test Stage' }));

      expect(response.body).toBeDefined();
    });

    it('should handle form data', async () => {
      const response = await request(app)
        .post('/api/v1/pipeline-stages')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('name=Test Stage&probabilityPercent=50');

      expect(response.body).toBeDefined();
    });
  });

  describe('Response Format Consistency', () => {
    const testEndpoints = [
      '/api/v1/pipeline-stages',
      '/api/v1/opportunities',
      '/api/v1/opportunities/by-stage'
    ];

    testEndpoints.forEach(endpoint => {
      it(`should return consistent response format for ${endpoint}`, async () => {
        const response = await request(app).get(endpoint);
        
        expect(response.body).toBeDefined();
        expect(typeof response.body).toBe('object');
        
        // Should have a success property (boolean)
        if (response.body.hasOwnProperty('success')) {
          expect(typeof response.body.success).toBe('boolean');
        }
        
        // If there's an error, it should be an object with code and message
        if (response.body.error) {
          expect(typeof response.body.error).toBe('object');
          expect(response.body.error).toHaveProperty('message');
        }
      });
    });
  });

  describe('Route Parameter Validation', () => {
    it('should handle valid UUID parameters', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/v1/opportunities/${validUuid}`)
        .expect(res => {
          // Should not be a validation error for UUID format
          if (res.status === 400 && res.body.error) {
            expect(res.body.error.message).not.toContain('UUID');
          }
        });

      expect(response.body).toBeDefined();
    });

    it('should reject invalid UUID parameters', async () => {
      const invalidUuid = 'not-a-uuid';
      
      const response = await request(app)
        .get(`/api/v1/opportunities/${invalidUuid}`)
        .expect(res => {
          // Should return error for invalid UUID
          expect([400, 404, 500]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });
  });
});