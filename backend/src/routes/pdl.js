const express = require('express');
const router = express.Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const pdlController = require('../controllers/pdlController');

// Middleware for all PDL routes - require authentication
router.use(authenticate);

// Validation middleware
const validateSearchQuery = (req, res, next) => {
  const { name, queryConfig } = req.body;
  
  if (!name || !queryConfig) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name and query configuration are required'
      }
    });
  }

  if (!queryConfig.jobTitles || !Array.isArray(queryConfig.jobTitles) || queryConfig.jobTitles.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'At least one job title is required in query configuration'
      }
    });
  }

  next();
};

const validateBulkOperation = (req, res, next) => {
  const { leadIds, operation } = req.body;
  
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Lead IDs array is required'
      }
    });
  }

  if (!['addToCRM', 'reject', 'updateStatus'].includes(operation)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid operation. Must be one of: addToCRM, reject, updateStatus'
      }
    });
  }

  if (leadIds.length > 50) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Cannot process more than 50 leads at once'
      }
    });
  }

  next();
};

// Potential Leads Management Routes
// GET /api/pdl/leads - Get all potential leads with filtering
router.get('/leads', 
  requirePermission('read_leads'), 
  pdlController.getPotentialLeads
);

// GET /api/pdl/leads/:id - Get a specific potential lead
router.get('/leads/:id', 
  requirePermission('read_leads'), 
  pdlController.getPotentialLead
);

// POST /api/pdl/leads/:id/add-to-crm - Add potential lead to CRM as contact
router.post('/leads/:id/add-to-crm', 
  requirePermission('create_contacts'), 
  pdlController.addToCRM
);

// POST /api/pdl/leads/:id/reject - Reject a potential lead
router.post('/leads/:id/reject', 
  requirePermission('update_leads'), 
  pdlController.rejectLead
);

// POST /api/pdl/leads/bulk - Bulk operations on leads
router.post('/leads/bulk', 
  requirePermission('update_leads'),
  validateBulkOperation,
  pdlController.bulkOperation
);

// PDL Search Operations
// POST /api/pdl/search - Execute a PDL search
router.post('/search', 
  requirePermission('pdl_search'), 
  pdlController.executeSearch
);

// Search Query Management
// GET /api/pdl/queries - Get all search queries
router.get('/queries', 
  requirePermission('read_leads'), 
  pdlController.getSearchQueries
);

// POST /api/pdl/queries - Create a new search query
router.post('/queries', 
  requirePermission('pdl_search'),
  validateSearchQuery,
  pdlController.createSearchQuery
);

// POST /api/pdl/queries/:id/run - Run a saved search query
router.post('/queries/:id/run', 
  requirePermission('pdl_search'), 
  pdlController.runSearchQuery
);

// API Usage and Statistics
// GET /api/pdl/usage - Get PDL API usage statistics
router.get('/usage', 
  requirePermission('admin'), 
  pdlController.getAPIUsage
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('PDL Router Error:', error);
  
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Database validation error',
        details: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      }
    });
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'CONSTRAINT_ERROR',
        message: 'Database constraint violation'
      }
    });
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});

module.exports = router;