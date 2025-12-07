const express = require('express');
const { body, query } = require('express-validator');
const contactController = require('../controllers/contactController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateUUID } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/v1/contacts
 * @desc    Get all contacts with pagination and filtering
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
  query('status')
    .optional()
    .isIn(['new', 'contacted', 'qualified', 'unqualified', 'nurturing', 'converted', 'lost'])
    .withMessage('Invalid lead status'),
  query('source')
    .optional()
    .isIn(['manual', 'linkedin', 'twitter', 'referral', 'website', 'email_campaign', 'cold_outreach', 'event', 'social_media', 'cold_call', 'trade_show', 'partner', 'pdl_discovery', 'other'])
    .withMessage('Invalid contact source'),
  query('assignedTo')
    .optional()
    .isUUID()
    .withMessage('Assigned to must be a valid UUID'),
  query('company')
    .optional()
    .isUUID()
    .withMessage('Company must be a valid UUID'),
  query('leadScore')
    .optional()
    .matches(/^\d+-\d+$/)
    .withMessage('Lead score must be in format "min-max"'),
  query('sort')
    .optional()
    .isIn(['firstName', 'lastName', 'email', 'leadScore', 'createdAt', 'updatedAt'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  validate
], contactController.getContacts);

/**
 * @route   GET /api/v1/contacts/:id
 * @desc    Get single contact by ID
 * @access  Private
 */
router.get('/:id', [
  authenticate,
  validateUUID('id'),
  validate
], contactController.getContactById);

/**
 * @route   POST /api/v1/contacts
 * @desc    Create new contact
 * @access  Private (Sales Rep+)
 */
router.post('/', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  body('firstName')
    .notEmpty()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be 1-100 characters'),
  body('lastName')
    .notEmpty()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be 1-100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phone')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Phone must be 1-50 characters'),
  body('jobTitle')
    .optional()
    .isLength({ min: 1, max: 150 })
    .withMessage('Job title must be 1-150 characters'),
  body('department')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Department must be 1-100 characters'),
  body('seniorityLevel')
    .optional()
    .isIn(['entry', 'mid', 'senior', 'director', 'vp', 'c_level'])
    .withMessage('Invalid seniority level'),
  body('linkedinUrl')
    .optional()
    .isURL()
    .withMessage('LinkedIn URL must be a valid URL'),
  body('twitterHandle')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Twitter handle must be 1-100 characters'),
  body('source')
    .notEmpty()
    .isIn(['manual', 'linkedin', 'twitter', 'referral', 'website', 'email_campaign', 'cold_outreach', 'event', 'pdl_discovery', 'social_media', 'cold_call', 'trade_show', 'partner', 'other'])
    .withMessage('Valid source is required'),
  body('leadScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Lead score must be between 0 and 100'),
  body('leadStatus')
    .optional()
    .isIn(['new', 'contacted', 'qualified', 'unqualified', 'nurturing', 'converted', 'lost'])
    .withMessage('Invalid lead status'),
  body('companyId')
    .optional()
    .isUUID()
    .withMessage('Company ID must be a valid UUID'),
  body('assignedTo')
    .optional()
    .isUUID()
    .withMessage('Assigned to must be a valid UUID'),
  body('notes')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Notes must be less than 5000 characters'),
  body('customFields')
    .optional()
    .isObject()
    .withMessage('Custom fields must be an object'),
  validate
], contactController.createContact);

/**
 * @route   PUT /api/v1/contacts/:id
 * @desc    Update contact
 * @access  Private (Sales Rep+)
 */
router.put('/:id', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  validateUUID('id'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be 1-100 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be 1-100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phone')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Phone must be 1-50 characters'),
  body('jobTitle')
    .optional()
    .isLength({ min: 1, max: 150 })
    .withMessage('Job title must be 1-150 characters'),
  body('department')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Department must be 1-100 characters'),
  body('seniorityLevel')
    .optional()
    .isIn(['entry', 'mid', 'senior', 'director', 'vp', 'c_level'])
    .withMessage('Invalid seniority level'),
  body('linkedinUrl')
    .optional()
    .isURL()
    .withMessage('LinkedIn URL must be a valid URL'),
  body('twitterHandle')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Twitter handle must be 1-100 characters'),
  body('source')
    .optional()
    .isIn(['manual', 'linkedin', 'twitter', 'referral', 'website', 'email_campaign', 'cold_outreach', 'event', 'pdl_discovery', 'social_media', 'cold_call', 'trade_show', 'partner', 'other'])
    .withMessage('Valid source is required'),
  body('leadScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Lead score must be between 0 and 100'),
  body('leadStatus')
    .optional()
    .isIn(['new', 'contacted', 'qualified', 'unqualified', 'nurturing', 'converted', 'lost'])
    .withMessage('Invalid lead status'),
  body('companyId')
    .optional()
    .isUUID()
    .withMessage('Company ID must be a valid UUID'),
  body('assignedTo')
    .optional()
    .isUUID()
    .withMessage('Assigned to must be a valid UUID'),
  body('notes')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Notes must be less than 5000 characters'),
  body('customFields')
    .optional()
    .isObject()
    .withMessage('Custom fields must be an object'),
  validate
], contactController.updateContact);

/**
 * @route   DELETE /api/v1/contacts/:id
 * @desc    Delete contact
 * @access  Private (Manager+)
 */
router.delete('/:id', [
  authenticate,
  authorize('manager', 'admin'),
  validateUUID('id'),
  validate
], contactController.deleteContact);

/**
 * @route   POST /api/v1/contacts/:id/convert
 * @desc    Convert contact to opportunity
 * @access  Private (Sales Rep+)
 */
router.post('/:id/convert', [
  authenticate,
  authorize('sales_rep', 'manager', 'admin'),
  validateUUID('id'),
  body('opportunityName')
    .notEmpty()
    .isLength({ min: 1, max: 255 })
    .withMessage('Opportunity name is required and must be 1-255 characters'),
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  body('expectedCloseDate')
    .optional()
    .isISO8601()
    .withMessage('Expected close date must be a valid date'),
  body('stageId')
    .optional()
    .isUUID()
    .withMessage('Stage ID must be a valid UUID'),
  validate
], contactController.convertContact);

/**
 * @route   GET /api/v1/contacts/:id/pdl-matches
 * @desc    Find PDL leads that match this contact
 * @access  Private
 */
router.get('/:id/pdl-matches', [
  authenticate,
  validateUUID('id'),
  validate
], contactController.findPDLMatches);

module.exports = router;