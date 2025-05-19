import express from 'express';
import logger from '../utils/logger.utils.js';
import { LOG_TYPES } from '../constants/strings.js';
import { successResponse, errorResponse } from '../controllers/base.controller.js';
import { cleanupLogs } from '../utils/logger.utils.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRateLimiter } from '../middleware/rate-limiter.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Apply rate limiting to all routes
router.use(apiRateLimiter);

// Apply authentication to all routes
router.use(authenticate);

/**
 * Get all logs
 * @route GET /api/logs
 */
router.get('/', async (req, res) => {
  try {
    const logsDir = path.join(__dirname, '../logs');
    
    // Check if logs directory exists
    try {
      await fs.access(logsDir);
    } catch (error) {
      // Directory doesn't exist, return empty logs
      return successResponse(res, { logs: [] });
    }
    
    const files = await fs.readdir(logsDir);
    
    const logs = await Promise.all(files.map(async (file) => {
      const filePath = path.join(logsDir, file);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      
      return {
        filename: file,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        content: content.split('\n').filter(line => line.trim())
      };
    }));

    return successResponse(res, { logs });
  } catch (error) {
    logger.error(`Failed to fetch logs: ${error.message}`, error);
    return errorResponse(res, error);
  }
});

/**
 * Get logs by type (success/error)
 * @route GET /api/logs/:type
 */
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    if (!['success', 'error'].includes(type)) {
      return errorResponse(res, new Error('Invalid log type'), 400);
    }

    const logsDir = path.join(__dirname, '../logs');
    
    // Check if logs directory exists
    try {
      await fs.access(logsDir);
    } catch (error) {
      // Directory doesn't exist, return empty logs
      return successResponse(res, { logs: [] });
    }
    
    const files = await fs.readdir(logsDir);
    const typeFiles = files.filter(file => file.includes(type));
    
    const logs = await Promise.all(typeFiles.map(async (file) => {
      const filePath = path.join(logsDir, file);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      
      return {
        filename: file,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        content: content.split('\n').filter(line => line.trim())
      };
    }));

    return successResponse(res, { logs });
  } catch (error) {
    logger.error(`Failed to fetch ${req.params.type} logs: ${error.message}`, error);
    return errorResponse(res, error);
  }
});

/**
 * Get logs by date range
 * @route GET /api/logs/range
 */
router.get('/range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return errorResponse(res, new Error('Start date and end date are required'), 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return errorResponse(res, new Error('Invalid date format'), 400);
    }

    const logsDir = path.join(__dirname, '../logs');
    
    // Check if logs directory exists
    try {
      await fs.access(logsDir);
    } catch (error) {
      // Directory doesn't exist, return empty logs
      return successResponse(res, { logs: [] });
    }
    
    const files = await fs.readdir(logsDir);
    
    const logs = await Promise.all(files.map(async (file) => {
      const filePath = path.join(logsDir, file);
      const stats = await fs.stat(filePath);
      
      // Check if file is within date range
      if (stats.mtime >= start && stats.mtime <= end) {
        const content = await fs.readFile(filePath, 'utf8');
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          content: content.split('\n').filter(line => line.trim())
        };
      }
      return null;
    }));

    // Filter out null values
    const filteredLogs = logs.filter(log => log !== null);

    return successResponse(res, { logs: filteredLogs });
  } catch (error) {
    logger.error(`Failed to fetch logs by date range: ${error.message}`, error);
    return errorResponse(res, error);
  }
});

/**
 * Clean up old logs
 * @route DELETE /api/logs/cleanup
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const { days = 14 } = req.query;
    await cleanupLogs(parseInt(days));
    return successResponse(res, { message: `Logs older than ${days} days have been cleaned up` });
  } catch (error) {
    logger.error(`Failed to cleanup logs: ${error.message}`, error);
    return errorResponse(res, error);
  }
});

// Create a new log
router.post('/', async (req, res) => {
  try {
    const { type, message, data } = req.body;
    
    if (!type || !message) {
      return errorResponse(res, new Error('Type and message are required'), 400);
    }
    
    if (!Object.values(LOG_TYPES).includes(type)) {
      return errorResponse(res, new Error('Invalid log type'), 400);
    }
    
    logger.log(type, message, data);
    
    return successResponse(res, { message: 'Log created successfully' }, 201);
  } catch (error) {
    logger.error(`Failed to create log: ${error.message}`, error);
    return errorResponse(res, error);
  }
});

// Update a log
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, message, data } = req.body;
    
    // This is a placeholder - in a real app, you would update the log in a database
    return successResponse(res, { message: 'Log updated successfully' });
  } catch (error) {
    logger.error(`Failed to update log: ${error.message}`, error);
    return errorResponse(res, error);
  }
});

// Delete a log
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // This is a placeholder - in a real app, you would delete the log from a database
    return successResponse(res, { message: 'Log deleted successfully' });
  } catch (error) {
    logger.error(`Failed to delete log: ${error.message}`, error);
    return errorResponse(res, error);
  }
});

export default router; 