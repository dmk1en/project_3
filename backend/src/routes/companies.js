const express = require('express');
const { body, query } = require('express-validator');
const companyController = require('../controllers/companyController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/v1/companies
 * @desc    Get all companies with pagination and filtering
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
  query('industry')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Industry must be 1-100 characters'),
  query('size')
    .optional()
    .isIn(['startup', 'small', 'medium', 'large', 'enterprise'])
    .withMessage('Invalid company size'),
  query('sort')
    .optional()
    .isIn(['name', 'createdAt', 'updatedAt'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  validate
], companyController.getCompanies);

/**
 * @route   GET /api/v1/companies/:id
 * @desc    Get single company by ID
 * @access  Private
 */
router.get('/:id', [
  authenticate,
  validate
], companyController.getCompanyById);

/**
 * @route   POST /api/v1/companies
 * @desc    Create new company
 * @access  Private (Sales Rep+)
 */
router.post('/', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  body('name')
    .notEmpty()
    .isLength({ min: 1, max: 255 })
    .withMessage('Company name is required and must be 1-255 characters'),
  body('domain')
    .optional()
    .isURL()
    .withMessage('Domain must be a valid URL'),
  body('industry')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Industry must be 1-100 characters'),
  body('size')
    .optional()
    .isIn(['startup', 'small', 'medium', 'large', 'enterprise'])
    .withMessage('Invalid company size'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('phone')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Phone must be 1-50 characters'),
  body('linkedinUrl')
    .optional()
    .isURL()
    .withMessage('LinkedIn URL must be a valid URL'),
  body('twitterHandle')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Twitter handle must be 1-100 characters'),
  body('revenueRange')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Revenue range must be 1-50 characters'),
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
  validate
], companyController.createCompany);

/**
 * @route   PUT /api/v1/companies/:id
 * @desc    Update company
 * @access  Private (Sales Rep+)
 */
router.put('/:id', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Company name must be 1-255 characters'),
  body('domain')
    .optional()
    .isURL()
    .withMessage('Domain must be a valid URL'),
  body('industry')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Industry must be 1-100 characters'),
  body('size')
    .optional()
    .isIn(['startup', 'small', 'medium', 'large', 'enterprise'])
    .withMessage('Invalid company size'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('phone')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Phone must be 1-50 characters'),
  body('linkedinUrl')
    .optional()
    .isURL()
    .withMessage('LinkedIn URL must be a valid URL'),
  body('twitterHandle')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Twitter handle must be 1-100 characters'),
  body('revenueRange')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Revenue range must be 1-50 characters'),
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
  validate
], companyController.updateCompany);

/**
 * @route   DELETE /api/v1/companies/:id
 * @desc    Delete company
 * @access  Private (Manager+)
 */
router.delete('/:id', [
  authenticate,
  authorize('manager', 'admin'),
  validate
], companyController.deleteCompany);

module.exports = router;