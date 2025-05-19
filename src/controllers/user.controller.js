import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import config from '../config/config.js';
import { logSuccess, logError, logWarning } from '../utils/logger.utils.js';
import {
  successResponse,
  errorResponse,
  validateRequiredFields,
  validateEmail,
  hasSQLInjection,
  hasXSSAttack,
  sanitizeInput
} from './base.controller.js';
import { USER_STRINGS } from '../constants/strings.js'

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 1 day in seconds
    },
    config.jwtSecret,
    { algorithm: 'HS256' }
  );
}

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response
 */
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    try {
      validateRequiredFields(req.body, ['name', 'email', 'password']);
    } catch (validationError) {
      logError('User registration validation failed', validationError, {
        requestId: req.requestId,
        email
      });
      return errorResponse(res, validationError, 400, 'Validation Error');
    }

    // Validate email format
    try {
      validateEmail(email);
    } catch (validationError) {
      logError('User registration failed - invalid email', validationError, {
        requestId: req.requestId,
        email
      });
      return errorResponse(res, validationError, 400, 'Validation Error');
    }

    // Check for SQL injection and XSS attacks
    try {
      if (hasSQLInjection(email) || hasXSSAttack(email)) {
        throw new Error(USER_STRINGS.VALIDATION.INVALID_INPUT);
      }
    } catch (validationError) {
      logError('User registration failed - security violation', validationError, {
        requestId: req.requestId,
        email
      });
      return errorResponse(res, validationError, 400, 'Security Error');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logWarning('User registration failed - email exists', {
        requestId: req.requestId,
        email
      });
      return errorResponse(res, new Error(USER_STRINGS.PROFILE.EMAIL_EXISTS), 409, 'Conflict');
    }

    // Create new user
    const user = new User({
      name: sanitizeInput(name),
      email: email.toLowerCase(),
      password: password
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    logSuccess('User registered successfully', {
      requestId: req.requestId,
      userId: user._id,
      email: user.email
    });

    return successResponse(res, {
      message: USER_STRINGS.AUTH.REGISTER_SUCCESS,
      token,
      user: user.toPublicJSON()
    }, 201);
  } catch (error) {
    logError('User registration failed', error, {
      requestId: req.requestId,
      email: req.body?.email
    });
    return errorResponse(res, error);
  }
}

/**
 * Authenticate user and generate JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate required fields
    try {
      validateRequiredFields(req.body, ['email', 'password']);
    } catch (validationError) {
      logError('User login validation failed', validationError, {
        requestId: req.requestId,
        email
      });
      return errorResponse(res, validationError, 400, 'Validation Error');
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      logWarning('User login failed - user not found', {
        requestId: req.requestId,
        email
      });
      return errorResponse(res, new Error(USER_STRINGS.AUTH.INVALID_CREDENTIALS), 401, 'Authentication Error');
    }
    console.log(password, user.password)
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log(password, user.password)
    if (!isValidPassword) {
      logWarning('User login failed - invalid password', {
        requestId: req.requestId,
        email
      });
      return errorResponse(res, new Error(USER_STRINGS.AUTH.INVALID_CREDENTIALS), 401, 'Authentication Error');
    }

    // Generate JWT token
    const token = generateToken(user);

    logSuccess('User logged in successfully', {
      requestId: req.requestId,
      userId: user._id,
      email: user.email
    });

    return successResponse(res, {
      message: USER_STRINGS.AUTH.LOGIN_SUCCESS,
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    logError('User login failed', error, {
      requestId: req.requestId,
      email: req.body?.email
    });
    return errorResponse(res, error);
  }
}

/**
 * Update user profile information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response
 */
export async function updateProfile(req, res) {
  try {
    const { name, email } = req.body;
    const userId = req.user.userId;

    // Find user
    const user = await User.findOne({ _id: userId, isActive: true });
    if (!user) {
      logWarning('Profile update failed - user not found', {
        requestId: req.requestId,
        userId
      });
      return errorResponse(res, new Error(USER_STRINGS.PROFILE.NOT_FOUND), 404, 'Not Found');
    }

    // Update fields if provided
    if (name) {
      if (hasXSSAttack(name)) {
        logError('Profile update failed - XSS attack detected', new Error(USER_STRINGS.VALIDATION.INVALID_NAME), {
          requestId: req.requestId,
          userId
        });
        return errorResponse(res, new Error(USER_STRINGS.VALIDATION.INVALID_NAME), 400, 'Validation Error');
      }
      user.name = sanitizeInput(name);
    }

    if (email) {
      if (!validateEmail(email)) {
        logError('Profile update failed - invalid email', new Error(USER_STRINGS.VALIDATION.INVALID_EMAIL), {
          requestId: req.requestId,
          userId,
          email
        });
        return errorResponse(res, new Error(USER_STRINGS.VALIDATION.INVALID_EMAIL), 400, 'Validation Error');
      }
      if (hasSQLInjection(email)) {
        logError('Profile update failed - SQL injection detected', new Error(USER_STRINGS.VALIDATION.INVALID_EMAIL), {
          requestId: req.requestId,
          userId,
          email
        });
        return errorResponse(res, new Error(USER_STRINGS.VALIDATION.INVALID_EMAIL), 400, 'Validation Error');
      }

      // Check if email is already taken
      const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
      if (existingUser) {
        logWarning('Profile update failed - email taken', {
          requestId: req.requestId,
          userId,
          email
        });
        return errorResponse(res, new Error(USER_STRINGS.PROFILE.EMAIL_TAKEN), 409, 'Conflict');
      }
      user.email = email.toLowerCase();
    }

    await user.save();
    logSuccess('User profile updated successfully', {
      requestId: req.requestId,
      userId: user._id,
      email: user.email
    });

    return successResponse(res, {
      message: USER_STRINGS.PROFILE.UPDATE_SUCCESS,
      user: user.toPublicJSON()
    });
  } catch (error) {
    logError('Profile update failed', error, {
      requestId: req.requestId,
      userId: req.user?.userId
    });
    return errorResponse(res, error);
  }
}

/**
 * Get user profile information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response
 */
export async function getProfile(req, res) {
  try {
    const userId = req.user.userId;

    const user = await User.findOne({ _id: userId, isActive: true });
    if (!user) {
      logWarning('Profile fetch failed - user not found', {
        requestId: req.requestId,
        userId
      });
      return errorResponse(res, new Error(USER_STRINGS.PROFILE.NOT_FOUND), 404, 'Not Found');
    }

    logSuccess('User profile fetched successfully', {
      requestId: req.requestId,
      userId: user._id,
      email: user.email
    });

    return successResponse(res, {
      user: user.toPublicJSON()
    });
  } catch (error) {
    logError('Profile fetch failed', error, {
      requestId: req.requestId,
      userId: req.user?.userId
    });
    return errorResponse(res, error);
  }
}

/**
 * Soft delete user account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response
 */
export async function deleteAccount(req, res) {
  try {
    const userId = req.user.userId;

    const user = await User.findOne({ _id: userId, isActive: true });
    if (!user) {
      logWarning('Account deletion failed - user not found', {
        requestId: req.requestId,
        userId
      });
      return errorResponse(res, new Error(USER_STRINGS.PROFILE.NOT_FOUND), 404, 'Not Found');
    }

    user.isActive = false;
    await user.save();

    logSuccess('User account deleted successfully', {
      requestId: req.requestId,
      userId: user._id,
      email: user.email
    });

    return successResponse(res, {
      message: USER_STRINGS.PROFILE.DELETE_SUCCESS
    });
  } catch (error) {
    logError('Account deletion failed', error, {
      requestId: req.requestId,
      userId: req.user?.userId
    });
    return errorResponse(res, error);
  }
}

export default {
  generateToken,
  register,
  login,
  updateProfile,
  getProfile,
  deleteAccount
};