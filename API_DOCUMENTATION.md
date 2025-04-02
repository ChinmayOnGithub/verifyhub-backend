# VerifyHub API Documentation

## Base URL

```
http://localhost:3000/api/certificates
```

## Authentication

Protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Rate Limiting

Public endpoints are rate-limited to 100 requests per IP address within a 15-minute window.

## Endpoints

### Certificate Generation and Upload (Protected)

#### 1. Generate Certificate

```http
POST /generate
Authorization: Bearer <token>
Content-Type: application/json
```

**Input Requirements:**

- Required Fields:
  - `studentName` (string): Full name of the student
  - `courseName` (string): Name of the course completed
  - `issueDate` (string): ISO date format (YYYY-MM-DD)
  - `organizationName` (string): Name of the issuing organization
  - `certificateId` (string): Unique identifier for the certificate
- Optional Fields:
  - `metadata` (object): Additional certificate information
    - `grade` (string): Student's grade/score
    - `duration` (string): Course duration
    - `instructor` (string): Course instructor name
    - `customFields` (object): Any additional custom fields

**Response Format:**

```json
{
  "success": true,
  "data": {
    "certificateId": "string",
    "ipfsHash": "string",
    "sha256Hash": "string",
    "cidHash": "string",
    "pdfUrl": "string",
    "createdAt": "ISO date string"
  }
}
```

#### 2. Upload External Certificate

```http
POST /upload/external
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Input Requirements:**

- Required Fields:
  - `certificate` (file): PDF file of the certificate
    - Max size: 10MB
    - Format: PDF only
    - Field name must be "certificate"
- Optional Fields:
  - `metadata` (string): JSON string containing additional metadata
    - `studentName` (string)
    - `courseName` (string)
    - `issueDate` (string)
    - `organizationName` (string)
    - `customFields` (object)

**Response Format:**

```json
{
  "success": true,
  "data": {
    "certificateId": "string",
    "ipfsHash": "string",
    "sha256Hash": "string",
    "cidHash": "string",
    "pdfUrl": "string",
    "createdAt": "ISO date string",
    "extractedMetadata": {
      // Automatically extracted metadata from PDF
    }
  }
}
```

### Certificate Verification (Public)

#### 1. Verify Certificate by ID

```http
GET /{certificateId}/verify
```

**Input Requirements:**

- URL Parameters:
  - `certificateId` (string): The unique identifier of the certificate to verify

**Response Format:**

```json
{
  "success": true,
  "data": {
    "isValid": boolean,
    "verificationDetails": {
      "databaseMatch": boolean,
      "blockchainMatch": boolean,
      "hashMatch": boolean,
      "verificationTimestamp": "ISO date string"
    },
    "certificateInfo": {
      "studentName": "string",
      "courseName": "string",
      "issueDate": "string",
      "organizationName": "string"
    }
  }
}
```

#### 2. Verify Certificate PDF

```http
POST /verify/pdf
Content-Type: multipart/form-data
```

**Input Requirements:**

- Required Fields:
  - `certificate` (file): PDF file to verify
    - Max size: 10MB
    - Format: PDF only
    - Field name must be "certificate"

**Response Format:**

```json
{
  "success": true,
  "data": {
    "isValid": boolean,
    "verificationDetails": {
      "databaseMatch": boolean,
      "blockchainMatch": boolean,
      "hashMatch": boolean,
      "verificationTimestamp": "ISO date string"
    },
    "certificateInfo": {
      "studentName": "string",
      "courseName": "string",
      "issueDate": "string",
      "organizationName": "string"
    }
  }
}
```

#### 3. Debug PDF Verification

```http
POST /debug/pdf
Content-Type: multipart/form-data
```

**Input Requirements:**

- Required Fields:
  - `certificate` (file): PDF file to debug
    - Max size: 10MB
    - Format: PDF only
    - Field name must be "certificate"

**Response Format:**

```json
{
  "success": true,
  "data": {
    "debugInfo": {
      "pdfHashes": {
        "sha256Hash": "string",
        "cidHash": "string"
      },
      "verificationSteps": [
        {
          "step": "string",
          "status": "success|failure",
          "details": "string"
        }
      ],
      "extractedMetadata": {
        // All metadata extracted from PDF
      },
      "comparisonResults": {
        // Detailed comparison results
      }
    }
  }
}
```

### Certificate Retrieval (Public)

#### 1. Get Certificate PDF

```http
GET /{certificateId}/pdf
```

**Input Requirements:**

- URL Parameters:
  - `certificateId` (string): The unique identifier of the certificate

**Response Format:**

- Content-Type: application/pdf
- Binary PDF file data

#### 2. Get Certificate Metadata

```http
GET /{certificateId}/metadata
```

**Input Requirements:**

- URL Parameters:
  - `certificateId` (string): The unique identifier of the certificate

**Response Format:**

```json
{
  "success": true,
  "data": {
    "studentName": "string",
    "courseName": "string",
    "issueDate": "string",
    "organizationName": "string",
    "certificateId": "string",
    "metadata": {
      "grade": "string",
      "duration": "string",
      "instructor": "string",
      "customFields": {
        // Additional custom fields
      }
    },
    "verificationStatus": "string",
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  }
}
```

#### 3. Search by CID

```http
GET /search/cid/{cid}
```

**Input Requirements:**

- URL Parameters:
  - `cid` (string): The Content Identifier (CID) hash to search for

**Response Format:**

```json
{
  "success": true,
  "data": {
    "certificateId": "string",
    "metadata": {
      "studentName": "string",
      "courseName": "string",
      "issueDate": "string",
      "organizationName": "string"
    },
    "verificationStatus": "string",
    "createdAt": "ISO date string"
  }
}
```

### Certificate Management (Protected)

#### 1. Get Certificate Stats

```http
GET /stats
Authorization: Bearer <token>
```

**Input Requirements:**

- No additional input required
- Valid JWT token in Authorization header

**Response Format:**

```json
{
  "success": true,
  "data": {
    "totalCertificates": number,
    "verifiedCertificates": number,
    "pendingVerification": number,
    "recentActivity": [
      {
        "certificateId": "string",
        "action": "string",
        "timestamp": "ISO date string",
        "details": "string"
      }
    ],
    "verificationStats": {
      "successRate": number,
      "averageVerificationTime": number
    }
  }
}
```

#### 2. Get Organization Certificates

```http
GET /organization/{orgName}
Authorization: Bearer <token>
```

**Input Requirements:**

- URL Parameters:
  - `orgName` (string): Name of the organization
- Query Parameters (optional):
  - `page` (number): Page number for pagination (default: 1)
  - `limit` (number): Number of items per page (default: 10)
  - `sortBy` (string): Field to sort by (default: "createdAt")
  - `sortOrder` (string): "asc" or "desc" (default: "desc")

**Response Format:**

```json
{
  "success": true,
  "data": {
    "organizationName": "string",
    "totalCertificates": number,
    "currentPage": number,
    "totalPages": number,
    "certificates": [
      {
        "certificateId": "string",
        "studentName": "string",
        "courseName": "string",
        "issueDate": "string",
        "verificationStatus": "string",
        "createdAt": "ISO date string"
      }
    ]
  }
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request parameters",
    "details": {
      // Specific validation errors
    }
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Certificate not found"
  }
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "retryAfter": number // seconds until next window
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Notes for Frontend Developers

1. All requests should include appropriate error handling
2. File uploads should use `multipart/form-data` with the field name `certificate`
3. Protected routes require a valid JWT token
4. Rate limiting is applied to public endpoints
5. PDF files should be properly validated before upload
6. All dates should be in ISO format
7. Responses include a `success` boolean flag and either `data` or `error` object
8. File size limits:
   - Maximum PDF size: 10MB
   - Supported formats: PDF only
9. Pagination is available for list endpoints
10. All timestamps are in ISO 8601 format
