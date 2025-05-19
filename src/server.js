import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/config.js';
import logger, { requestLogger } from './utils/logger.utils.js';
import userRoutes from './routes/user.routes.js';
import logRoutes from './routes/log.routes.js';
import filesRoutes from './routes/files.route.js';
import { apiRateLimiter, userRateLimiter } from './middleware/rate-limiter.middleware.js';
import { EventEmitter } from 'events';
import { connectDB } from './database/database.config.js';

// Increase the maximum number of listeners
EventEmitter.defaultMaxListeners = 20;

const app = express();

// Middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(express.json());
app.use(apiRateLimiter); // Apply general API rate limiting

// Request logging middleware
app.use(requestLogger);

// Routes with specific rate limiting
app.use('/api/user/', userRateLimiter, userRoutes);
app.use('/api/logs/', apiRateLimiter, logRoutes);
app.use('/api/files/', apiRateLimiter, filesRoutes);

// Health check endpoint
app.get('/api/user/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Resource Not Found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 