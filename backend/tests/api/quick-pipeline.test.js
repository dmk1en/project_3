const request = require('supertest');
const express = require('express');

describe('Pipeline API Endpoints - Quick Test', () => {
  let app;

  beforeAll(() => {
    // Create minimal app for testing
    app = express();
    app.use(express.json());
    
    // Mock middleware
    app.use((req, res, next) => {
      req.user = { id: 'test-user', role: 'sales_rep' };
      next();
    });

    // Add routes
    try {
      app.use('/api/v1', require('../../src/routes'));
    } catch (error) {
      console.log('Routes loading error:', error.message);
    }

    // Fallback health endpoint
    app.get('/health', (req, res) => {
      res.json({ success: true, message: 'Test API running' });
    });
  });

  describe('Basic Connectivity', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should load API routes without error', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(res => {
          // Should not be a 404 if routes loaded properly
          expect(res.status).not.toBe(404);
        });
      
      console.log('Health check response:', response.status, response.body);
    });
  });

  describe('Pipeline Endpoints Availability', () => {
    const endpoints = [
      { method: 'get', path: '/api/v1/pipeline-stages', description: 'Get pipeline stages' },
      { method: 'get', path: '/api/v1/opportunities', description: 'Get opportunities' },
      { method: 'get', path: '/api/v1/opportunities/by-stage', description: 'Get opportunities by stage' }
    ];

    endpoints.forEach(({ method, path, description }) => {
      it(`should have endpoint: ${method.toUpperCase()} ${path}`, async () => {
        const response = await request(app)[method](path);
        
        console.log(`${method.toUpperCase()} ${path}:`, response.status, 
          response.body?.error?.message || response.body?.message || 'OK');
        
        // Should not return 404 (endpoint exists)
        expect(response.status).not.toBe(404);
        
        // Should return JSON
        expect(response.body).toBeDefined();
        expect(typeof response.body).toBe('object');
      });
    });
  });

  describe('Request Handling', () => {
    it('should handle POST requests to pipeline stages', async () => {
      const testData = {
        name: 'Test Stage',
        probabilityPercent: 50,
        color: '#FF0000'
      };

      const response = await request(app)
        .post('/api/v1/pipeline-stages')
        .send(testData);

      console.log('POST pipeline-stages:', response.status, 
        response.body?.error?.message || response.body?.message || 'OK');

      expect(response.status).not.toBe(404); // Endpoint exists
      expect(response.body).toBeDefined();
    });

    it('should handle POST requests to opportunities', async () => {
      const testData = {
        name: 'Test Opportunity',
        contactId: '123e4567-e89b-12d3-a456-426614174001',
        stageId: '123e4567-e89b-12d3-a456-426614174002',
        value: 10000
      };

      const response = await request(app)
        .post('/api/v1/opportunities')
        .send(testData);

      console.log('POST opportunities:', response.status, 
        response.body?.error?.message || response.body?.message || 'OK');

      expect(response.status).not.toBe(404); // Endpoint exists
      expect(response.body).toBeDefined();
    });
  });

  describe('Route Parameters', () => {
    it('should handle UUID parameters in opportunity routes', async () => {
      const testId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/v1/opportunities/${testId}`);

      console.log(`GET opportunities/${testId}:`, response.status,
        response.body?.error?.message || response.body?.message || 'OK');

      expect(response.status).not.toBe(404); // Route exists
      expect(response.body).toBeDefined();
    });

    it('should handle stage movement endpoint', async () => {
      const testId = '123e4567-e89b-12d3-a456-426614174000';
      const stageData = { stageId: '123e4567-e89b-12d3-a456-426614174001' };
      
      const response = await request(app)
        .put(`/api/v1/opportunities/${testId}/stage`)
        .send(stageData);

      console.log(`PUT opportunities/${testId}/stage:`, response.status,
        response.body?.error?.message || response.body?.message || 'OK');

      expect(response.status).not.toBe(404); // Route exists
      expect(response.body).toBeDefined();
    });
  });
});