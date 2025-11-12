const express = require('express');
const { body, query } = require('express-validator');
const pipelineStageController = require('../controllers/pipelineStageController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateUUID } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/v1/pipeline-stages
 * @desc    Get all pipeline stages
 * @access  Private
 */
router.get('/', [
  authenticate,
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('Include inactive must be a boolean'),
  query('includeStats')
    .optional()
    .isBoolean()
    .withMessage('Include stats must be a boolean'),
  validate
], pipelineStageController.getStages);

/**
 * @route   GET /api/v1/pipeline-stages/analytics
 * @desc    Get stage conversion analytics
 * @access  Private (Manager+)
 */
router.get('/analytics', [
  authenticate,
  authorize('manager', 'admin'),
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
], pipelineStageController.getStageAnalytics);

/**
 * @route   GET /api/v1/pipeline-stages/:id
 * @desc    Get single pipeline stage by ID
 * @access  Private
 */
router.get('/:id', [
  authenticate,
  validateUUID('id'),
  validate
], pipelineStageController.getStageById);

/**
 * @route   POST /api/v1/pipeline-stages
 * @desc    Create new pipeline stage
 * @access  Private (Manager+)
 */
router.post('/', [
  authenticate,
  authorize('manager', 'admin'),
  body('name')
    .notEmpty()
    .isLength({ min: 1, max: 100 })
    .withMessage('Stage name is required and must be 1-100 characters'),
  body('probabilityPercent')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Probability percent must be between 0 and 100'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Is active must be a boolean'),
  validate
], pipelineStageController.createStage);

/**
 * @route   PUT /api/v1/pipeline-stages/:id
 * @desc    Update pipeline stage
 * @access  Private (Manager+)
 */
router.put('/:id', [
  authenticate,
  authorize('manager', 'admin'),
  validateUUID('id'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Stage name must be 1-100 characters'),
  body('probabilityPercent')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Probability percent must be between 0 and 100'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Is active must be a boolean'),
  validate
], pipelineStageController.updateStage);

/**
 * @route   DELETE /api/v1/pipeline-stages/:id
 * @desc    Delete pipeline stage
 * @access  Private (Admin only)
 */
router.delete('/:id', [
  authenticate,
  authorize('admin'),
  validateUUID('id'),
  body('moveToStageId')
    .optional()
    .isUUID()
    .withMessage('Move to stage ID must be a valid UUID'),
  validate
], pipelineStageController.deleteStage);

/**
 * @route   PUT /api/v1/pipeline-stages/reorder
 * @desc    Reorder pipeline stages
 * @access  Private (Manager+)
 */
router.put('/reorder', [
  authenticate,
  authorize('manager', 'admin'),
  body('stageIds')
    .isArray({ min: 1 })
    .withMessage('Stage IDs must be a non-empty array'),
  body('stageIds.*')
    .isUUID()
    .withMessage('Each stage ID must be a valid UUID'),
  validate
], pipelineStageController.reorderStages);

/**
 * @route   PUT /api/v1/pipeline-stages/:id/toggle-status
 * @desc    Toggle pipeline stage active status
 * @access  Private (Manager+)
 */
router.put('/:id/toggle-status', [
  authenticate,
  authorize('manager', 'admin'),
  validateUUID('id'),
  validate
], pipelineStageController.toggleStageStatus);

module.exports = router;