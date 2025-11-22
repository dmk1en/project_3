const { User } = require('../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

class AdminController {
  // Get user statistics
  static async getUserStats(req, res) {
    try {
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { status: 'active' } });
      const adminUsers = await User.count({ where: { role: 'admin' } });
      const suspendedUsers = await User.count({ where: { status: 'suspended' } });

      res.json({
        success: true,
        data: {
          totalUsers,
          activeUsers,
          adminUsers,
          suspendedUsers
        }
      });
    } catch (error) {
      console.error('Error getting user stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user statistics',
        error: error.message
      });
    }
  }

  // Get all users with pagination and filtering
  static async getUsers(req, res) {
    try {
      const {
        page = 1,
        pageSize = 10,
        search,
        role,
        status,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const where = {};
      
      // Search filter
      if (search) {
        where[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Role filter
      if (role) {
        where.role = role;
      }

      // Status filter
      if (status) {
        where.status = status;
      }

      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const { count, rows } = await User.findAndCountAll({
        where,
        offset,
        limit,
        order: [[sortBy, sortOrder]],
        attributes: { exclude: ['password'] }
      });

      res.json({
        success: true,
        data: {
          users: rows,
          total: count,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: Math.ceil(count / parseInt(pageSize))
        }
      });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users',
        error: error.message
      });
    }
  }

  // Get specific user by ID
  static async getUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user',
        error: error.message
      });
    }
  }

  // Get default permissions for a role
  static getDefaultPermissions(role) {
    const rolePermissions = {
      admin: [
        'admin', 'read_leads', 'update_leads', 'delete_leads', 'pdl_search',
        'manage_contacts', 'manage_companies', 'manage_users'
      ],
      manager: [
        'read_leads', 'update_leads', 'delete_leads', 'pdl_search',
        'manage_contacts', 'manage_companies'
      ],
      user: [
        'read_leads', 'update_leads', 'pdl_search', 'manage_contacts'
      ],
      viewer: [
        'read_leads'
      ],
      sales_rep: [
        'read_leads', 'update_leads', 'pdl_search', 'manage_contacts'
      ],
      analyst: [
        'read_leads', 'manage_contacts'
      ]
    };
    
    return rolePermissions[role] || [];
  }

  // Create new user
  static async createUser(req, res) {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        role = 'user',
        status = 'active',
        permissions
      } = req.body;

      // Use provided permissions or default ones based on role
      const userPermissions = permissions && permissions.length > 0 
        ? permissions 
        : AdminController.getDefaultPermissions(role);

      // Validate required fields
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'First name, last name, email, and password are required'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        status,
        permissions: userPermissions
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user.toJSON();

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      });
    }
  }

  // Update user
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const {
        firstName,
        lastName,
        email,
        role,
        status,
        permissions
      } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if email is being changed and if it's already taken
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'Email already in use by another user'
          });
        }
      }

      // Update user
      await user.update({
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        email: email || user.email,
        role: role || user.role,
        status: status || user.status,
        permissions: permissions || user.permissions
      });

      // Return updated user without password
      const { password: _, ...userWithoutPassword } = user.toJSON();

      res.json({
        success: true,
        message: 'User updated successfully',
        data: userWithoutPassword
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }
  }

  // Delete user
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Prevent deleting yourself
      if (req.user.id === parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own account'
        });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.destroy();

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
    }
  }

  // Toggle user status (activate/suspend)
  static async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;

      // Prevent suspending yourself
      if (req.user.id === parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own status'
        });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await user.update({ status: newStatus });

      res.json({
        success: true,
        message: `User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`,
        data: { id: user.id, status: newStatus }
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: error.message
      });
    }
  }

  // Reset user password
  static async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
        error: error.message
      });
    }
  }

  // Get default permissions for a role
  static async getRolePermissions(req, res) {
    try {
      const { role } = req.params;
      
      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Role is required'
        });
      }

      const permissions = AdminController.getDefaultPermissions(role);
      
      res.json({
        success: true,
        data: { role, permissions }
      });
    } catch (error) {
      console.error('Error getting role permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get role permissions',
        error: error.message
      });
    }
  }

  // Bulk actions
  static async bulkAction(req, res) {
    try {
      const { action, userIds } = req.body;

      if (!action || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Action and user IDs are required'
        });
      }

      // Prevent bulk actions on self
      if (userIds.includes(req.user.id)) {
        return res.status(400).json({
          success: false,
          message: 'You cannot perform bulk actions on your own account'
        });
      }

      let updatedCount = 0;

      switch (action) {
        case 'activate':
          updatedCount = await User.update(
            { status: 'active' },
            { where: { id: userIds } }
          );
          break;
        case 'suspend':
          updatedCount = await User.update(
            { status: 'suspended' },
            { where: { id: userIds } }
          );
          break;
        case 'delete':
          updatedCount = await User.destroy({
            where: { id: userIds }
          });
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action'
          });
      }

      res.json({
        success: true,
        message: `Bulk ${action} completed successfully`,
        data: { updatedCount: Array.isArray(updatedCount) ? updatedCount[0] : updatedCount }
      });
    } catch (error) {
      console.error('Error performing bulk action:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk action',
        error: error.message
      });
    }
  }
}

module.exports = AdminController;