# Chatscribe API Backend

A robust Node.js backend API for a chatbot application with user authentication, file processing, and AI-powered chat capabilities.

## Features

- 🔐 User Authentication (JWT)
- 📁 PDF File Processing
- 🤖 AI-Powered Chat (Google Gemini)
- 📝 Comprehensive Logging System
- 🔍 Advanced Search Capabilities
- 🛡️ Security Features (XSS, SQL Injection Protection)

## Tech Stack

- Node.js & Express.js
- MongoDB & Mongoose
- JWT Authentication
- Google Gemini AI
- Winston Logger
- Multer (File Upload)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Google Gemini API Key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chatbot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/chatbot
MONGODB_URI_TEST=mongodb://localhost:27017/chatbot_test

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=24h

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_MODEL=gemini-1.5-pro-latest

# Bcrypt Configuration
BCRYPT_SALT_ROUNDS=10

# Logging Configuration
LOG_RETENTION_DAYS=14
LOG_LEVEL=info
```

4. Start the server:
```bash
npm start
```

## API Documentation

### Authentication APIs

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "User registered successfully",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-03-15T10:30:00.000Z"
    }
  },
  "statusCode": 201
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "statusCode": 200
}
```

### User Profile APIs

#### Get Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-03-15T10:30:00.000Z"
    }
  },
  "statusCode": 200
}
```

#### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Profile updated successfully",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Updated",
      "email": "john.updated@example.com",
      "updatedAt": "2024-03-15T11:30:00.000Z"
    }
  },
  "statusCode": 200
}
```

#### Delete Account
```http
DELETE /api/users/profile
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Account deleted successfully"
  },
  "statusCode": 200
}
```

### File Processing APIs

#### Upload PDF
```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <pdf_file>
```

Response:
```json
{
  "success": true,
  "data": {
    "fileId": "507f1f77bcf86cd799439012",
    "name": "document.pdf",
    "extractedData": {
      "title": "Sample Document",
      "content": "This is the extracted content...",
      "metadata": {
        "author": "John Doe",
        "date": "2024-03-15"
      }
    }
  },
  "statusCode": 200
}
```

#### Search PDF Content
```http
POST /api/files/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "search term",
  "fileId": "507f1f77bcf86cd799439012"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "query": "search term",
    "results": [
      {
        "fileId": "507f1f77bcf86cd799439012",
        "fileName": "document.pdf",
        "matches": true
      }
    ]
  },
  "statusCode": 200
}
```

### Log Management APIs

#### Get All Logs
```http
GET /api/logs
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "filename": "success-2024-03-15.log",
        "type": "success",
        "size": 1024,
        "createdAt": "2024-03-15T10:00:00.000Z"
      }
    ]
  },
  "statusCode": 200
}
```

#### Get Logs by Type
```http
GET /api/logs/error
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "filename": "error-2024-03-15.log",
        "type": "error",
        "size": 512,
        "createdAt": "2024-03-15T10:00:00.000Z"
      }
    ]
  },
  "statusCode": 200
}
```

#### Get Logs by Date Range
```http
GET /api/logs/range?start=2024-03-01&end=2024-03-15
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "filename": "success-2024-03-15.log",
        "type": "success",
        "size": 1024,
        "createdAt": "2024-03-15T10:00:00.000Z"
      }
    ]
  },
  "statusCode": 200
}
```

#### Cleanup Old Logs
```http
DELETE /api/logs/cleanup?days=30
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Logs older than 30 days have been cleaned up",
    "deletedCount": 5
  },
  "statusCode": 200
}
```

## Error Responses

All APIs follow a consistent error response format:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": "Additional error details"
  },
  "statusCode": 400
}
```

Common HTTP Status Codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- XSS protection
- SQL injection prevention
- Input sanitization
- Request validation
- Rate limiting
- Secure headers

## Logging

The application uses Winston for logging with the following features:
- Rotating file transport
- Separate logs for success and error
- Log retention policy
- Request ID tracking
- Detailed error logging
- Performance monitoring

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Generate documentation
npm run docs
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License. 