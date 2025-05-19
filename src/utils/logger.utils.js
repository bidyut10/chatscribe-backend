import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for detailed logging
const detailedFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}] ${requestId ? `[${requestId}] ` : ''}${message} ${metaStr}`;
  })
);

// Create rotating file transports
const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d',
  format: detailedFormat
});

const successRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, 'success-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: detailedFormat
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: detailedFormat,
  defaultMeta: { service: 'chatbot-api' },
  transports: [errorRotateTransport, successRotateTransport]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Handle MongoDB deprecation warnings
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('MONGODB DRIVER')) {
    logger.info('MongoDB Configuration Notice', {
      type: 'info',
      warning: warning.message
    });
  }
});

// Create a request context middleware
export const requestLogger = (req, res, next) => {
  req.requestId = uuidv4();
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
};

// Log cleanup function
export const cleanupLogs = async (daysToKeep = 14) => {
  try {
    const files = await fs.promises.readdir(logsDir);
    
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stats = await fs.promises.stat(filePath);
      const daysOld = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysOld > daysToKeep) {
        await fs.promises.unlink(filePath);
        logger.info(`Deleted old log file: ${file}`);
      }
    }
  } catch (error) {
    logger.error('Error cleaning up logs:', error);
  }
};

// Enhanced logging methods
export const logSuccess = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'success' });
};

export const logError = (message, error, meta = {}) => {
  logger.error(message, {
    ...meta,
    type: 'error',
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    }
  });
};

// Redirect warning and debug logs to success log
export const logWarning = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'warning' });
};

export const logDebug = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'debug' });
};

// Log environment configuration
export const logEnvironmentConfig = () => {
  const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGODB_URI ? '***' : 'not set',
    geminiApiKey: process.env.GEMINI_API_KEY ? '***' : 'not set',
    openaiApiKey: process.env.OPENAI_API_KEY ? '***' : 'not set'
  };

  logger.info('Environment Configuration', {
    type: 'info',
    config
  });
};

export default logger; 