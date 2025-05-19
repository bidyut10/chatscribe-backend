export const USER_STRINGS = {
  // Authentication messages
  AUTH: {
    REGISTER_SUCCESS: 'User registered successfully',
    LOGIN_SUCCESS: 'Login successful',
    INVALID_CREDENTIALS: 'Invalid credentials',
    TOKEN_EXPIRED: 'Token has expired',
    TOKEN_INVALID: 'Invalid token',
    UNAUTHORIZED: 'Unauthorized access',
    LOGOUT_SUCCESS: 'Logged out successfully'
  },

  // Profile messages
  PROFILE: {
    UPDATE_SUCCESS: 'Profile updated successfully',
    GET_SUCCESS: 'Profile retrieved successfully',
    DELETE_SUCCESS: 'Account deleted successfully',
    NOT_FOUND: 'User not found',
    EMAIL_EXISTS: 'Email already registered',
    EMAIL_TAKEN: 'Email already taken'
  },

  // Validation messages
  VALIDATION: {
    REQUIRED_FIELDS: 'Required fields missing',
    INVALID_EMAIL: 'Invalid email format',
    INVALID_PASSWORD: 'Password must be at least 8 characters long',
    INVALID_NAME: 'Name must be between 2 and 50 characters',
    INVALID_INPUT: 'Invalid input detected',
    SQL_INJECTION: 'SQL injection detected',
    XSS_ATTACK: 'XSS attack detected'
  },

  // Error messages
  ERROR: {
    SERVER_ERROR: 'Internal server error',
    DATABASE_ERROR: 'Database operation failed',
    VALIDATION_ERROR: 'Validation Error',
    AUTHENTICATION_ERROR: 'Authentication Error',
    SECURITY_ERROR: 'Security Error',
    CONFLICT: 'Conflict',
    NOT_FOUND: 'Not Found'
  },

  // Log messages
  LOG: {
    USER_REGISTERED: 'User registered successfully:',
    USER_LOGGED_IN: 'User logged in successfully:',
    USER_UPDATED: 'User profile updated:',
    USER_DELETED: 'User account deleted:',
    TOKEN_GENERATED: 'Token generated for user:',
    TOKEN_INVALIDATED: 'Token invalidated for user:'
  },

  // Rate limiting
  RATE_LIMIT: {
    PREFIX: 'ratelimit:',
    EXCEEDED: 'Too many requests, please try again later'
  },

  // File processing messages
  FILE: {
    UPLOAD_SUCCESS: 'File uploaded successfully',
    UPLOAD_FAILED: 'File upload failed',
    PROCESSING: 'File is being processed',
    PROCESSING_COMPLETE: 'File processing completed',
    PROCESSING_FAILED: 'File processing failed',
    INVALID_FILE_TYPE: 'Invalid file type. Only PDF files are allowed',
    FILE_TOO_LARGE: 'File size exceeds the maximum limit',
    FILE_NOT_FOUND: 'File not found',
    EXTRACTION_SUCCESS: 'Data extracted successfully',
    EXTRACTION_FAILED: 'Data extraction failed'
  },

  // PDF extraction messages
  PDF: {
    EXTRACTING: 'Extracting data from PDF',
    EXTRACTION_COMPLETE: 'PDF data extraction completed',
    EXTRACTION_FAILED: 'PDF data extraction failed',
    INVALID_PDF: 'Invalid PDF file',
    PROCESSING_ERROR: 'Error processing PDF file'
  },

  // Search messages
  SEARCH: {
    NO_RESULTS: 'No results found',
    SEARCH_SUCCESS: 'Search completed successfully',
    INVALID_QUERY: 'Invalid search query'
  }
};

// Logging Constants
export const LOG_TYPES = {
  ERROR: 'error',
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO: 'info'
};

export const LOG_RETENTION_DAYS = 30; 