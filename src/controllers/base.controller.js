import logger, { logError, logSuccess } from '../utils/logger.utils.js';
import { USER_STRINGS } from '../constants/strings.js'

// Custom error class for API errors
export class APIError extends Error {
  constructor(message, statusCode = 500, type = 'Server Error', code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.code = code;
    this.name = 'APIError';
  }
}

// Validation error class
export class ValidationError extends APIError {
  constructor(message, errors = []) {
    super(message, 400, 'Validation Error', 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

// Authentication error class
export class AuthError extends APIError {
  constructor(message) {
    super(message, 401, 'Authentication Error', 'AUTH_ERROR');
  }
}

// Authorization error class
export class AuthorizationError extends APIError {
  constructor(message) {
    super(message, 403, 'Authorization Error', 'FORBIDDEN');
  }
}

// Not found error class
export class NotFoundError extends APIError {
  constructor(message) {
    super(message, 404, 'Not Found', 'NOT_FOUND');
  }
}

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Success message
 */
export function successResponse(res, data, statusCode = 200, message = 'Success') {
  const response = {
    success: true,
    message,
    data,
    error: null
  };

  logSuccess('API Response', {
    statusCode,
    path: res.req?.path,
    method: res.req?.method,
    requestId: res.req?.requestId
  });

  return res.status(statusCode).json(response);
}

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} type - Error type
 */
export function errorResponse(res, error, statusCode = 500, type = 'Server Error') {
  const errorResponse = {
    success: false,
    message: error.message || USER_STRINGS.ERROR.SERVER_ERROR,
    data: null,
    error: {
      type: error.type || type,
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || USER_STRINGS.ERROR.SERVER_ERROR,
      ...(error.errors && { errors: error.errors }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  };

  logError('API Error', error, {
    statusCode: error.statusCode || statusCode,
    path: res.req?.path,
    method: res.req?.method,
    requestId: res.req?.requestId
  });

  return res.status(error.statusCode || statusCode).json(errorResponse);
}

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {Array} fields - Required fields
 * @returns {Object} Validation result
 */
export function validateRequiredFields(body, fields) {
  const missingFields = fields.filter(field => !body[field]);
  if (missingFields.length > 0) {
    throw new ValidationError('Missing required fields', missingFields.map(field => ({
      field,
      message: `${field} is required`
    })));
  }
  return true;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', [{
      field: 'email',
      message: 'Invalid email format'
    }]);
  }
  return true;
}

/**
 * Check for SQL injection attempts
 * @param {string} input - Input to check
 * @returns {boolean} True if SQL injection is detected
 */
export function hasSQLInjection(input) {
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)|(['"])/i;
  if (sqlPattern.test(input)) {
    throw new ValidationError('Potential SQL injection detected', [{
      field: 'input',
      message: 'Invalid input detected'
    }]);
  }
  return false;
}

/**
 * Check for XSS attack attempts
 * @param {string} input - Input to check
 * @returns {boolean} True if XSS attack is detected
 */
export function hasXSSAttack(input) {
  const xssPattern = /<[^>]*>|javascript:|data:|vbscript:|on\w+=/i;
  if (xssPattern.test(input)) {
    throw new ValidationError('Potential XSS attack detected', [{
      field: 'input',
      message: 'Invalid input detected'
    }]);
  }
  return false;
}

/**
 * Sanitize user input
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Format date for response
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  return date ? new Date(date).toISOString() : null;
}

/**
 * Get pagination options from query parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Pagination options
 */
export function getPaginationOptions(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    sort: query.sort || { createdAt: -1 }
  };
}

/**
 * Format paginated response
 * @param {Array} data - Response data
 * @param {number} total - Total count
 * @param {Object} options - Pagination options
 * @returns {Object} Formatted response
 */
export function formatPaginatedResponse(data, total, options) {
  const { page, limit } = options;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}