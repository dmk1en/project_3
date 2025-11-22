const authService = require('../services/authService');
const { User, UserSession } = require('../models');
const { Op } = require('sequelize');

class AuthController {
  /**
   * User login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }

      if (user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account is not active'
          }
        });
      }

      // Verify password
      const isPasswordValid = await authService.comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }

      // Create token payload
      const userPayload = authService.createUserPayload(user);

      // Generate tokens
      const accessToken = authService.generateAccessToken(userPayload);
      const refreshToken = authService.generateRefreshToken({ id: user.id });

      // Store refresh token in database
      const tokenHash = authService.generateTokenHash(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await UserSession.create({
        userId: user.id,
        tokenHash,
        expiresAt
      });

      // Update last login
      await user.update({ lastLogin: new Date() });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            permissions: user.permissions || [],
            isActive: user.status === 'active' // For backward compatibility
          },
          accessToken,
          refreshToken,
          expiresIn: 3600 // 1 hour in seconds
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during login'
        }
      });
    }
  }

  /**
   * Refresh access token
   */
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required'
          }
        });
      }

      // Verify refresh token
      const decoded = authService.verifyRefreshToken(refreshToken);
      const tokenHash = authService.generateTokenHash(refreshToken);

      // Check if token exists in database and is not expired
      const session = await UserSession.findOne({
        where: {
          userId: decoded.id,
          tokenHash,
          expiresAt: {
            [Op.gt]: new Date()
          }
        },
        include: [{
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] }
        }]
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token'
          }
        });
      }

      if (!session.user.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account is inactive'
          }
        });
      }

      // Generate new access token
      const userPayload = authService.createUserPayload(session.user);
      const accessToken = authService.generateAccessToken(userPayload);

      res.json({
        success: true,
        data: {
          accessToken,
          expiresIn: 3600
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
    }
  }

  /**
   * User logout
   */
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (refreshToken) {
        const tokenHash = authService.generateTokenHash(refreshToken);
        
        // Remove the refresh token from database
        await UserSession.destroy({
          where: {
            userId: req.user.id,
            tokenHash
          }
        });
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during logout'
        }
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      // Set no-cache headers to prevent 304 responses
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching profile'
        }
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const { firstName, lastName, preferences } = req.body;
      
      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Update user data
      await user.update({
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName
      });

      const updatedUser = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      res.json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating profile'
        }
      });
    }
  }
}

module.exports = new AuthController();