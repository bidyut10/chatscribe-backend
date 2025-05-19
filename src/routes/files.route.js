import express from 'express';
import multer from 'multer';
import { apiRateLimiter } from '../middleware/rate-limiter.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { extractPdfData, searchPdfData } from '../controllers/file.controller.js';
import { USER_STRINGS } from '../constants/strings.js';

const router = express.Router();

// Configure multer for PDF uploads
const upload = multer({
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error(USER_STRINGS.FILE.INVALID_FILE_TYPE), false);
        }
    }
});

// Apply rate limiting to all routes
router.use(apiRateLimiter);

// Routes
router.post('/extract', apiRateLimiter, authenticate, upload.single('file'), extractPdfData);
router.post('/search', authenticate, searchPdfData);

export default router;