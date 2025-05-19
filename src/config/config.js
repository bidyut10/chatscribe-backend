import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'JWT_SECRET',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/chatscribe',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
  },
  jwt: {
    expiresIn: process.env.JWT_EXPIRY || '24h'
  },
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
    credentials: true,
    maxAge: 86400 
  },
  gemini: {
    geminiKey: process.env.GEMINI_API_KEY || 'GEMINI_API_KEY',
    geminiModel: process.env.GEMINI_API_MODEL || 'GEMINI_API_MODEL',
  },
  logging: {
    retentionDays: parseInt(process.env.LOG_RETENTION_DAYS) || 14,
    level: process.env.LOG_LEVEL || 'info'
  },
  fileUpload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'application/pdf').split(',')
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  }
};

export default config; 