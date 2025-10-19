const express = require('express');
const { body, query } = require('express-validator');
const socialController = require('../controllers/socialController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateUUID } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/v1/social/profiles
 * @desc    Get social profiles with optional filtering
 * @access  Private
 */
router.get('/profiles', [
  authenticate,
  query('contactId')
    .optional()
    .isUUID()
    .withMessage('Contact ID must be a valid UUID'),
  query('platform')
    .optional()
    .isIn(['linkedin', 'twitter', 'facebook', 'instagram'])
    .withMessage('Invalid platform'),
  validate
], socialController.getSocialProfiles);

/**
 * @route   POST /api/v1/social/profiles
 * @desc    Create or update social profile
 * @access  Private (Sales Rep+)
 */
router.post('/profiles', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  body('contactId')
    .notEmpty()
    .isUUID()
    .withMessage('Contact ID is required and must be a valid UUID'),
  body('platform')
    .notEmpty()
    .isIn(['linkedin', 'twitter', 'facebook', 'instagram'])
    .withMessage('Valid platform is required'),
  body('profileUrl')
    .notEmpty()
    .isURL()
    .withMessage('Profile URL is required and must be a valid URL'),
  body('username')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Username must be 1-100 characters'),
  body('followersCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Followers count must be a non-negative integer'),
  body('followingCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Following count must be a non-negative integer'),
  body('postCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Post count must be a non-negative integer'),
  body('engagementRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Engagement rate must be between 0 and 100'),
  body('profileData')
    .optional()
    .isObject()
    .withMessage('Profile data must be an object'),
  validate
], socialController.createSocialProfile);

/**
 * @route   PUT /api/v1/social/profiles/:id/metrics
 * @desc    Update social profile metrics
 * @access  Private (Sales Rep+)
 */
router.put('/profiles/:id/metrics', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  validateUUID('id'),
  body('followersCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Followers count must be a non-negative integer'),
  body('followingCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Following count must be a non-negative integer'),
  body('postCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Post count must be a non-negative integer'),
  body('engagementRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Engagement rate must be between 0 and 100'),
  body('profileData')
    .optional()
    .isObject()
    .withMessage('Profile data must be an object'),
  validate
], socialController.updateProfileMetrics);

/**
 * @route   DELETE /api/v1/social/profiles/:id
 * @desc    Delete social profile
 * @access  Private (Manager+)
 */
router.delete('/profiles/:id', [
  authenticate,
  authorize('manager', 'admin'),
  validateUUID('id'),
  validate
], socialController.deleteSocialProfile);

/**
 * @route   POST /api/v1/social/discover
 * @desc    Discover leads from social media
 * @access  Private (Sales Rep+)
 */
router.post('/discover', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  body('keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  body('keywords.*')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each keyword must be 1-100 characters'),
  body('platforms')
    .optional()
    .isArray()
    .withMessage('Platforms must be an array'),
  body('platforms.*')
    .optional()
    .isIn(['linkedin', 'twitter', 'facebook', 'instagram'])
    .withMessage('Invalid platform in platforms array'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  body('filters.location')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Location filter must be 1-100 characters'),
  body('filters.industry')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Industry filter must be 1-100 characters'),
  body('filters.companySize')
    .optional()
    .isArray()
    .withMessage('Company size filter must be an array'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200'),
  validate
], socialController.discoverLeads);

/**
 * @route   POST /api/v1/social/posts/analyze
 * @desc    Analyze social media posts
 * @access  Private (Sales Rep+)
 */
router.post('/posts/analyze', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  body('profileId')
    .optional()
    .isUUID()
    .withMessage('Profile ID must be a valid UUID'),
  body('platform')
    .notEmpty()
    .isIn(['linkedin', 'twitter', 'facebook', 'instagram'])
    .withMessage('Valid platform is required'),
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
  validate
], socialController.analyzePosts);

module.exports = router;