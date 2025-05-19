import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { USER_STRINGS } from '../constants/strings.js';
import logger from '../utils/logger.utils.js';

// In-memory token blacklist
const tokenBlacklist = new Set();

//Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'Authentication Error',
          message: USER_STRINGS.AUTH.UNAUTHORIZED
        }
      });
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'Authentication Error',
          message: USER_STRINGS.AUTH.TOKEN_INVALID
        }
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Check token expiration
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({
        success: false,
        error: {
          type: 'Authentication Error',
          message: USER_STRINGS.AUTH.TOKEN_EXPIRED
        }
      });
    }

    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: {
        type: 'Authentication Error',
        message: USER_STRINGS.AUTH.TOKEN_INVALID
      }
    });
  }
};

//Blacklist token middleware
export const blacklistToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      // Add token to blacklist
      tokenBlacklist.add(token);
      
      // Clean up expired tokens from blacklist periodically
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          setTimeout(() => {
            tokenBlacklist.delete(token);
          }, ttl * 1000);
        }
      }
    }
    next();
  } catch (error) {
    logger.error('Token blacklist error:', error);
    next();
  }
}; 