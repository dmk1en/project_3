const express = require('express');
const authRoutes = require('./auth');
const companyRoutes = require('./companies');
const contactRoutes = require('./contacts');
const opportunityRoutes = require('./opportunities');
const pipelineStageRoutes = require('./pipelineStages');
const socialRoutes = require('./social');
const analyticsRoutes = require('./analytics');
const pdlRoutes = require('./pdl');
const adminRoutes = require('./admin');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/contacts', contactRoutes);
router.use('/opportunities', opportunityRoutes);
router.use('/pipeline-stages', pipelineStageRoutes);
router.use('/social', socialRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/pdl', pdlRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CRM API is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CRM Consulting API v1',
    documentation: '/api/v1/docs',
    endpoints: {
      auth: '/api/v1/auth',
      companies: '/api/v1/companies',
      contacts: '/api/v1/contacts',
      opportunities: '/api/v1/opportunities',
      pipelineStages: '/api/v1/pipeline-stages',
      social: '/api/v1/social',
      analytics: '/api/v1/analytics',
      pdl: '/api/v1/pdl',
      health: '/api/v1/health'
    }
  });
});

module.exports = router;