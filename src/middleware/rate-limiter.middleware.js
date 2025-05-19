import { USER_STRINGS } from '../constants/strings.js';
import logger from '../utils/logger.utils.js';

// In-memory rate limit store
const rateLimitStore = new Map();

/**
 * Rate limiter middleware using in-memory storage
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
export const rateLimiter = (options = {}) => {
  const {
    windowSeconds = 60, // Default: 1 minute window
    maxRequests = 100, // Default: 100 requests per window
    keyPrefix = USER_STRINGS.RATE_LIMIT.PREFIX
  } = options;

  return async (req, res, next) => {
    try {
      // Get client IP or user ID for rate limiting key
      const identifier = req.user?.userId || req.ip;
      const key = `${keyPrefix}${identifier}`;
      const now = Date.now();
      const windowMs = windowSeconds * 1000;

      // Get or initialize rate limit data
      let rateLimitData = rateLimitStore.get(key) || {
        requests: [],
        lastCleanup: now
      };

      // Clean up old requests
      if (now - rateLimitData.lastCleanup > windowMs) {
        rateLimitData.requests = rateLimitData.requests.filter(
          timestamp => now - timestamp < windowMs
        );
        rateLimitData.lastCleanup = now;
      }

      // Check if rate limit is exceeded
      if (rateLimitData.requests.length >= maxRequests) {
        logger.warn(`Rate limit exceeded for ${identifier} on path ${req.path}`);
        return res.status(429).json({
          success: false,
          error: {
            type: 'Rate Limit Error',
            message: USER_STRINGS.RATE_LIMIT.EXCEEDED
          }
        });
      }

      // Add current request
      rateLimitData.requests.push(now);
      rateLimitStore.set(key, rateLimitData);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - rateLimitData.requests.length);
      res.setHeader('X-RateLimit-Reset', Math.ceil((rateLimitData.lastCleanup + windowMs) / 1000));

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      next();
    }
  };
};

/**
 * Specific rate limiters for different routes
 */
export const authRateLimiter = rateLimiter({
  windowSeconds: 300, // 5 minutes
  maxRequests: 5, // 5 requests per 5 minutes for auth routes
  keyPrefix: `${USER_STRINGS.RATE_LIMIT.PREFIX}auth:`
});

export const userRateLimiter = rateLimiter({
  windowSeconds: 60, // 1 minute
  maxRequests: 30, // 30 requests per minute for user routes
  keyPrefix: `${USER_STRINGS.RATE_LIMIT.PREFIX}user:`
});

export const apiRateLimiter = rateLimiter({
  windowSeconds: 60, // 1 minute
  maxRequests: 100, // 100 requests per minute for general API routes
  keyPrefix: `${USER_STRINGS.RATE_LIMIT.PREFIX}api:`
}); 