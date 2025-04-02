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

{
  "studentName": "string",
  "courseName": "string",
  "issueDate": "string (ISO date)",
  "organizationName": "string",
  "certificateId": "string",
  "metadata": {
    // Optional additional metadata
  }
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "certificateId": "string",
    "ipfsHash": "string",
    "sha256Hash": "string",
    "cidHash": "string"
  }
}
```

#### 2. Upload External Certificate

```http
POST /upload/external
Authorization: Bearer <token>
Content-Type: multipart/form-data

certificate: <PDF file>
```

**Response**:

```json
{
  "success": true,
  "data": {
    "certificateId": "string",
    "ipfsHash": "string",
    "sha256Hash": "string",
    "cidHash": "string"
  }
}
```

### Certificate Verification (Public)

#### 1. Verify Certificate by ID

```http
GET /{certificateId}/verify
```

**Response**:

```json
{
  "success": true,
  "data": {
    "isValid": boolean,
    "verificationDetails": {
      "databaseMatch": boolean,
      "blockchainMatch": boolean,
      "hashMatch": boolean
    }
  }
}
```

#### 2. Verify Certificate PDF

```http
POST /verify/pdf
Content-Type: multipart/form-data

certificate: <PDF file>
```

**Response**:

```json
{
  "success": true,
  "data": {
    "isValid": boolean,
    "verificationDetails": {
      "databaseMatch": boolean,
      "blockchainMatch": boolean,
      "hashMatch": boolean
    }
  }
}
```

#### 3. Debug PDF Verification

```http
POST /debug/pdf
Content-Type: multipart/form-data

certificate: <PDF file>
```

**Response**:

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
        // Detailed verification steps
      ]
    }
  }
}
```

### Certificate Retrieval (Public)

#### 1. Get Certificate PDF

```http
GET /{certificateId}/pdf
```

**Response**: PDF file

#### 2. Get Certificate Metadata

```http
GET /{certificateId}/metadata
```

**Response**:

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
      // Additional metadata
    }
  }
}
```

#### 3. Search by CID

```http
GET /search/cid/{cid}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "certificateId": "string",
    "metadata": {
      // Certificate metadata
    }
  }
}
```

### Certificate Management (Protected)

#### 1. Get Certificate Stats

```http
GET /stats
Authorization: Bearer <token>
```

**Response**:

```json
{
  "success": true,
  "data": {
    "totalCertificates": number,
    "verifiedCertificates": number,
    "pendingVerification": number,
    "recentActivity": [
      // Recent certificate activities
    ]
  }
}
```

#### 2. Get Organization Certificates

```http
GET /organization/{orgName}
Authorization: Bearer <token>
```

**Response**:

```json
{
  "success": true,
  "data": {
    "organizationName": "string",
    "certificates": [
      {
        "certificateId": "string",
        "studentName": "string",
        "courseName": "string",
        "issueDate": "string",
        "verificationStatus": "string"
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
    "message": "Invalid request parameters"
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
    "message": "Too many requests, please try again later"
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
