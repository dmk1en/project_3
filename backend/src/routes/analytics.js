const express = require('express');
const { query, body } = require('express-validator');
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get dashboard analytics
 * @access  Private
 */
router.get('/dashboard', [
  authenticate,
  query('period')
    .optional()
    .isIn(['today', 'week', 'month', 'quarter', 'year'])
    .withMessage('Invalid period'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('userId')
    .optional()
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  validate
], analyticsController.getDashboard);

/**
 * @route   GET /api/v1/analytics/sales-performance
 * @desc    Get sales performance report
 * @access  Private (Sales Rep+)
 */
router.get('/sales-performance', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'quarter', 'year'])
    .withMessage('Invalid period'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('userId')
    .optional()
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  validate
], analyticsController.getSalesPerformance);

/**
 * @route   GET /api/v1/analytics/lead-sources
 * @desc    Get lead sources analysis
 * @access  Private (Sales Rep+)
 */
router.get('/lead-sources', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  query('period')
    .optional()
    .isIn(['week', 'month', 'quarter', 'year'])
    .withMessage('Invalid period'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  validate
], analyticsController.getLeadSources);

/**
 * @route   POST /api/v1/analytics/reports/custom
 * @desc    Generate custom report
 * @access  Private (Manager+)
 */
router.post('/reports/custom', [
  authenticate,
  authorize('manager', 'admin'),
  body('reportType')
    .notEmpty()
    .isIn(['activity_summary', 'pipeline_analysis', 'user_performance'])
    .withMessage('Valid report type is required'),
  body('dateRange')
    .optional()
    .isObject()
    .withMessage('Date range must be an object'),
  body('dateRange.start')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('dateRange.end')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  body('groupBy')
    .optional()
    .isArray()
    .withMessage('Group by must be an array'),
  body('metrics')
    .optional()
    .isArray()
    .withMessage('Metrics must be an array'),
  validate
], analyticsController.generateCustomReport);

module.exports = router;