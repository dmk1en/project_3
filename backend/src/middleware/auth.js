const authService = require('../services/authService');
const { User, UserSession } = require('../models');

/**
 * Authentication middleware to verify JWT tokens
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required'
        }
      });
    }

    // Verify the token
    const decoded = authService.verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['passwordHash'] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive'
        }
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: error.message || 'Invalid or expired token'
      }
    });
  }
};

/**
 * Authorization middleware to check user roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Define role-based permissions
    const rolePermissions = {
      admin: [
        'admin', 'create_contacts', 'read_contacts', 'update_contacts', 'delete_contacts',
        'create_companies', 'read_companies', 'update_companies', 'delete_companies',
        'create_opportunities', 'read_opportunities', 'update_opportunities', 'delete_opportunities',
        'read_leads', 'update_leads', 'pdl_search', 'manage_users'
      ],
      sales: [
        'create_contacts', 'read_contacts', 'update_contacts',
        'create_companies', 'read_companies', 'update_companies',
        'create_opportunities', 'read_opportunities', 'update_opportunities',
        'read_leads', 'update_leads', 'pdl_search'
      ],
      marketing: [
        'read_contacts', 'update_contacts',
        'read_companies', 'update_companies',
        'read_opportunities', 'update_opportunities',
        'read_leads', 'update_leads', 'pdl_search'
      ],
      viewer: [
        'read_contacts', 'read_companies', 'read_opportunities', 'read_leads'
      ]
    };

    const userPermissions = rolePermissions[req.user.role] || [];

    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission '${permission}' required`
        }
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = authService.verifyAccessToken(token);
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['passwordHash'] }
      });

      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  optionalAuth
};