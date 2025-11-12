const express = require('express');
const { body, query } = require('express-validator');
const opportunityController = require('../controllers/opportunityController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateUUID } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/v1/opportunities
 * @desc    Get all opportunities with pagination and filtering
 * @access  Private
 */
router.get('/', [
  authenticate,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Search term must be 1-255 characters'),
  query('stageId')
    .optional()
    .isUUID()
    .withMessage('Stage ID must be a valid UUID'),
  query('assignedTo')
    .optional()
    .isUUID()
    .withMessage('Assigned to must be a valid UUID'),
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Company ID must be a valid UUID'),
  query('contactId')
    .optional()
    .isUUID()
    .withMessage('Contact ID must be a valid UUID'),
  query('minValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum value must be a positive number'),
  query('maxValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum value must be a positive number'),
  query('expectedCloseDateStart')
    .optional()
    .isISO8601()
    .withMessage('Expected close date start must be a valid date'),
  query('expectedCloseDateEnd')
    .optional()
    .isISO8601()
    .withMessage('Expected close date end must be a valid date'),
  query('sort')
    .optional()
    .isIn(['name', 'value', 'expectedCloseDate', 'createdAt', 'updatedAt'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  validate
], opportunityController.getOpportunities);

/**
 * @route   GET /api/v1/opportunities/by-stage
 * @desc    Get opportunities grouped by pipeline stage (Kanban view)
 * @access  Private
 */
router.get('/by-stage', [
  authenticate,
  query('assignedTo')
    .optional()
    .isUUID()
    .withMessage('Assigned to must be a valid UUID'),
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Company ID must be a valid UUID'),
  query('minValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum value must be a positive number'),
  query('maxValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum value must be a positive number'),
  validate
], opportunityController.getOpportunitiesByStage);

/**
 * @route   GET /api/v1/opportunities/:id
 * @desc    Get single opportunity by ID
 * @access  Private
 */
router.get('/:id', [
  authenticate,
  validateUUID('id'),
  validate
], opportunityController.getOpportunityById);

/**
 * @route   POST /api/v1/opportunities
 * @desc    Create new opportunity
 * @access  Private (Sales Rep+)
 */
router.post('/', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  body('name')
    .notEmpty()
    .isLength({ min: 1, max: 255 })
    .withMessage('Opportunity name is required and must be 1-255 characters'),
  body('contactId')
    .notEmpty()
    .isUUID()
    .withMessage('Contact ID is required and must be a valid UUID'),
  body('companyId')
    .optional()
    .isUUID()
    .withMessage('Company ID must be a valid UUID'),
  body('stageId')
    .notEmpty()
    .isUUID()
    .withMessage('Stage ID is required and must be a valid UUID'),
  body('assignedTo')
    .optional()
    .isUUID()
    .withMessage('Assigned to must be a valid UUID'),
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .withMessage('Currency must be a valid 3-letter currency code'),
  body('probability')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Probability must be between 0 and 100'),
  body('expectedCloseDate')
    .optional()
    .isISO8601()
    .withMessage('Expected close date must be a valid date'),
  body('actualCloseDate')
    .optional()
    .isISO8601()
    .withMessage('Actual close date must be a valid date'),
  body('source')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Source must be 1-100 characters'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('nextAction')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Next action must be less than 1000 characters'),
  body('customFields')
    .optional()
    .isObject()
    .withMessage('Custom fields must be an object'),
  validate
], opportunityController.createOpportunity);

/**
 * @route   PUT /api/v1/opportunities/:id
 * @desc    Update opportunity
 * @access  Private (Sales Rep+)
 */
router.put('/:id', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  validateUUID('id'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Opportunity name must be 1-255 characters'),
  body('contactId')
    .optional()
    .isUUID()
    .withMessage('Contact ID must be a valid UUID'),
  body('companyId')
    .optional()
    .isUUID()
    .withMessage('Company ID must be a valid UUID'),
  body('stageId')
    .optional()
    .isUUID()
    .withMessage('Stage ID must be a valid UUID'),
  body('assignedTo')
    .optional()
    .isUUID()
    .withMessage('Assigned to must be a valid UUID'),
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .withMessage('Currency must be a valid 3-letter currency code'),
  body('probability')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Probability must be between 0 and 100'),
  body('expectedCloseDate')
    .optional()
    .isISO8601()
    .withMessage('Expected close date must be a valid date'),
  body('actualCloseDate')
    .optional()
    .isISO8601()
    .withMessage('Actual close date must be a valid date'),
  body('source')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Source must be 1-100 characters'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('nextAction')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Next action must be less than 1000 characters'),
  body('customFields')
    .optional()
    .isObject()
    .withMessage('Custom fields must be an object'),
  validate
], opportunityController.updateOpportunity);

/**
 * @route   DELETE /api/v1/opportunities/:id
 * @desc    Delete opportunity
 * @access  Private (Manager+)
 */
router.delete('/:id', [
  authenticate,
  authorize('manager', 'admin'),
  validateUUID('id'),
  validate
], opportunityController.deleteOpportunity);

/**
 * @route   PUT /api/v1/opportunities/:id/stage
 * @desc    Move opportunity to a different stage
 * @access  Private (Sales Rep+)
 */
router.put('/:id/stage', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  validateUUID('id'),
  body('stageId')
    .notEmpty()
    .isUUID()
    .withMessage('Stage ID is required and must be a valid UUID'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  validate
], opportunityController.moveToStage);

module.exports = router;