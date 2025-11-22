const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticate, requirePermission } = require('../middleware/auth');

// Apply authentication to all admin routes
router.use(authenticate);

// Apply admin permission check to all routes
router.use(requirePermission('admin'));

// User statistics
router.get('/stats', AdminController.getUserStats);

// User management routes
router.get('/users', AdminController.getUsers);
router.get('/users/:id', AdminController.getUser);
router.post('/users', AdminController.createUser);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);

// User status management
router.patch('/users/:id/toggle-status', AdminController.toggleUserStatus);
router.patch('/users/:id/reset-password', AdminController.resetPassword);

// Role permissions
router.get('/roles/:role/permissions', AdminController.getRolePermissions);

// Bulk actions
router.post('/users/bulk-action', AdminController.bulkAction);

module.exports = router;