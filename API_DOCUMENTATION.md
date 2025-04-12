# VerifyHub API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

Protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Rate Limiting

Public endpoints are rate-limited to 100 requests per IP address within a 15-minute window.

## Response Format Standards

All API endpoints follow these standardized response formats:

### Success Responses

```json
{
  "success": true,
  "status": "SUCCESS",
  "message": "Operation completed successfully",
  "data": {
    // Response data specific to the endpoint
  },
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

### Error Responses

```json
{
  "success": false,
  "status": "ERROR",
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // Optional additional error details
  },
  "requestId": "7a4f9b2c", // For tracking issues
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

### Verification Responses

```json
{
  "success": true, // or false depending on verification result
  "status": "VALID", // or "INVALID", "REVOKED", etc.
  "message": "Certificate is valid and verified", // Human-readable message
  "verificationId": "7a4f9b2c",
  "certificate": {
    // Certificate details
  },
  "_links": {
    // Related resources
  },
  // Additional verification data
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

### Warning/Partial Success Responses

```json
{
  "success": true,
  "status": "SUCCESS_WITH_WARNING",
  "message": "Warning message", // Contains the warning
  "data": {
    // Success data
  },
  "warningDetails": {
    // Optional additional warning information
  },
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

## API Endpoints

### 1. Authentication API

#### 1.1 User Registration

Register a new user account.

```http
POST /auth/register
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "institution"
}
```

**Response:**

```json
{
  "success": true,
  "status": "SUCCESS",
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "institution"
    },
    "tokens": {
      "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

#### 1.2 User Login

Authenticate a user and receive access tokens.

```http
POST /auth/login
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "success": true,
  "status": "SUCCESS",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "institution"
    },
    "tokens": {
      "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

#### 1.3 Refresh Token

Get new access token using refresh token.

```http
POST /auth/refresh
Content-Type: application/json
```

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "success": true,
  "status": "SUCCESS",
  "message": "Tokens refreshed successfully",
  "data": {
    "tokens": {
      "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

### 2. Certificate API

#### 2.1 Generate Certificate (Protected)

Create and issue a new certificate, storing it on blockchain.

```http
POST /certificates/generate
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "uid": "PRN123",
  "candidateName": "Jane Smith",
  "courseName": "Blockchain Development",
  "orgName": "Tech University"
}
```

**Response:**

```json
{
  "success": true,
  "status": "SUCCESS",
  "message": "Certificate successfully generated",
  "data": {
    "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "shortCode": "XY12",
    "ipfsHash": "QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd",
    "sha256Hash": "23f0d3298f57b2ff3f008696b07922526550bb241fd8ea338c50fcd32143e58d",
    "cidHash": "QmQkwxxoSneaPyWzGcZ3Zr5sXmCEKZeEPGaqLt87DA16DJ",
    "revoked": false,
    "timestamp": 1686838245000,
    "_links": {
      "verification": "http://localhost:3000/api/certificates/8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1/verify",
      "shortCodeVerification": "http://localhost:3000/api/certificates/code/XY12",
      "pdf": "http://localhost:3000/api/certificates/8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1/pdf",
      "blockchainExplorer": "http://localhost:8545/tx/0x1d3e...",
      "ipfsGateway": "https://gateway.pinata.cloud/ipfs/QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd"
    },
    "transaction": {
      "hash": "0x1d3e...",
      "block": "42",
      "gasUsed": "218468",
      "networkId": "5777"
    }
  },
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

#### 2.2 Upload External Certificate (Protected)

Upload an existing PDF certificate and register it on the blockchain.

```http
POST /certificates/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**

- `certificate` (file): PDF certificate file
- `candidateName` (string): Name of the certificate recipient
- `orgName` (string): Name of the issuing organization
- `courseName` (string, optional): Name of the course

**Response:**

```json
{
  "success": true,
  "status": "SUCCESS",
  "message": "Certificate uploaded and verified",
  "data": {
    "certificateId": "c1fb2bfc5c5de0bf63f0c44ae0fa1e1e69d32dbb4f3b0cd4fd76876960c4004d",
    "shortCode": "AB9Z",
    "verificationUrl": "/api/certificates/c1fb2bfc5c5de0bf63f0c44ae0fa1e1e69d32dbb4f3b0cd4fd76876960c4004d/verify",
    "ipfsGateway": "https://gateway.pinata.cloud/ipfs/QmW6JqR3fLutt3GiTqES2aqJbbXAHcRtPFUUYQgdgz6Nk7",
    "transaction": {
      "hash": "0x2d8e...",
      "block": 43
    },
    "computedHashes": {
      "sha256Hash": "f1a2fd4e8c3b5ad76e4c43634a6778c9e169d92bb3f1f166cd9c33a7032264f2",
      "cidHash": "QmV7ExY6jb7eS61bqGK3FjzS1HHr1qLJcsHGnvHefAVnY4",
      "ipfsHash": "QmW6JqR3fLutt3GiTqES2aqJbbXAHcRtPFUUYQgdgz6Nk7"
    }
  },
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

#### 2.3 Verify Certificate by ID

Verify a certificate's authenticity by its full ID.

```http
GET /certificates/:certificateId/verify
```

**Response:**

```json
{
  "success": true,
  "status": "VALID",
  "message": "Certificate is valid and verified",
  "verificationId": "ab4f29d1",
  "certificate": {
    "uid": "PRN123",
    "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "candidateName": "Jane Smith",
    "courseName": "Blockchain Development",
    "orgName": "Tech University",
    "issuedAt": "2023-06-10T08:15:30.123Z",
    "ipfsHash": "QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd",
    "shortCode": "XY12",
    "revoked": false
  },
  "_links": {
    "pdf": "https://gateway.pinata.cloud/ipfs/QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd",
    "blockchain": "http://localhost:8545/tx/0x1d3e..."
  },
  "blockchainVerified": true,
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

#### 2.4 Verify Certificate by Short Code

Verify a certificate using its short verification code.

```http
GET /certificates/code/:shortCode
```

**Response:**
Same format as the verification by ID response.

#### 2.5 Verify Certificate PDF

Verify a certificate by uploading the PDF file.

```http
POST /certificates/verify/pdf
Content-Type: multipart/form-data
```

**Form Data:**

- `certificate` (file): PDF certificate file to verify

**Response:**
Same format as the verification by ID response, with additional hash information.

#### 2.6 Get Certificate PDF

Download the PDF certificate.

```http
GET /certificates/:certificateId/pdf
```

**Response:**
The actual PDF file of the certificate.

#### 2.7 View Certificate PDF

View or download the PDF certificate directly from IPFS.

```http
GET /certificates/:certificateId/view-pdf
```

**Purpose:**
This endpoint provides direct access to certificate PDFs stored on IPFS. It supports both viewing the PDF in a browser and downloading it with a meaningful filename.

**Route Parameters:**

- `certificateId` (string): The 64-character hexadecimal certificate ID

**Query Parameters:**

- `download` (boolean): Set to 'true' to download the file, otherwise it will be viewed in the browser

**Behavior:**

- **View Mode** (default): Redirects the user's browser directly to the IPFS gateway URL where the PDF can be viewed
- **Download Mode** (`download=true`): Serves a small HTML page that automatically triggers a download with a proper filename

**Technical Details:**

- The endpoint verifies the certificate exists in the database
- It checks that the certificate has an associated IPFS hash
- No proxying is performed; content is served directly from IPFS
- Filename for downloads: `certificate-{shortCode or first 8 chars of certificateId}.pdf`

**Response (View Mode):**

- A 302 redirect to the IPFS gateway URL

**Response (Download Mode):**

- A HTML page that automatically triggers a download of the PDF file with an appropriate filename
- Content-Type: text/html
- Cache-Control: no-cache

**Error Responses:**

```json
{
  "success": false,
  "message": "Invalid certificate ID format",
  "details": "Certificate ID must be a 64-character hexadecimal string"
}
```

```json
{
  "success": false,
  "message": "Certificate not found",
  "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1"
}
```

```json
{
  "success": false,
  "message": "Certificate has no associated PDF",
  "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1"
}
```

```json
{
  "success": false,
  "message": "Failed to serve certificate PDF",
  "details": "Error message details"
}
```

#### 2.8 Get Certificate Metadata

Retrieve metadata about a certificate.

```http
GET /certificates/:certificateId/metadata
```

**Response:**

```json
{
  "success": true,
  "status": "SUCCESS",
  "message": "Certificate metadata retrieved successfully",
  "data": {
    "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "candidateName": "Jane Smith",
    "courseName": "Blockchain Development",
    "orgName": "Tech University",
    "issueDate": "2023-06-10T08:15:30.123Z",
    "hashes": {
      "ipfsHash": "QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd",
      "sha256Hash": "23f0d3298f57b2ff3f008696b07922526550bb241fd8ea338c50fcd32143e58d",
      "cidHash": "QmQkwxxoSneaPyWzGcZ3Zr5sXmCEKZeEPGaqLt87DA16DJ"
    },
    "shortCode": "XY12",
    "status": "VALID",
    "_links": {
      "verification": "/api/certificates/8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1/verify",
      "shortCodeVerification": "/api/certificates/code/XY12",
      "pdf": "/api/certificates/8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1/pdf",
      "blockchain": "/api/certificates/8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1/blockchain"
    }
  },
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

#### 2.9 Search Certificate by CID/Hash

Search for a certificate using any associated hash (IPFS, CID, SHA-256).

```http
GET /certificates/search/cid/:cid
```

**Response:**
Same format as the verification response.

#### 2.10 Get Certificate Statistics (Protected)

Get statistics about certificates issued.

```http
GET /certificates/stats
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "status": "SUCCESS",
  "message": "Statistics retrieved successfully",
  "data": {
    "totalCertificates": 42,
    "issuedLast24Hours": 5,
    "totalVerifications": 120,
    "verificationSuccess": 115,
    "verificationFailure": 5,
    "topCourses": [
      {
        "name": "Blockchain Fundamentals",
        "count": 15
      },
      {
        "name": "Advanced Cryptography",
        "count": 12
      }
    ]
  },
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

#### 2.11 Get Organization Certificates (Protected)

Get all certificates issued by a specific organization.

```http
GET /certificates/organization/:orgName
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "status": "SUCCESS",
  "message": "Organization certificates retrieved",
  "data": {
    "organization": "Tech University",
    "totalCertificates": 28,
    "certificates": [
      {
        "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
        "candidateName": "Jane Smith",
        "courseName": "Blockchain Development",
        "issueDate": "2023-06-10T08:15:30.123Z",
        "shortCode": "XY12",
        "status": "VALID"
      }
      // Additional certificates...
    ]
  },
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

### 3. Verification Statuses

| Status               | Description                                            | Success Flag |
| -------------------- | ------------------------------------------------------ | ------------ |
| `VALID`              | Certificate is valid and verified on blockchain        | `true`       |
| `VALID_WITH_WARNING` | Certificate is valid but with some verification issues | `true`       |
| `INVALID`            | Certificate is invalid                                 | `false`      |
| `REVOKED`            | Certificate has been revoked by the issuer             | `false`      |
| `ERROR`              | System error occurred during verification              | `false`      |
| `NOT_FOUND`          | Certificate doesn't exist in the database              | `false`      |

### 4. Error Codes

| Error Code                 | HTTP Status | Description                      |
| -------------------------- | ----------- | -------------------------------- |
| `INVALID_INPUT`            | 400         | Invalid input parameters         |
| `MISSING_REQUIRED_FIELD`   | 400         | Required field is missing        |
| `INVALID_FORMAT`           | 400         | Data format is invalid           |
| `UNAUTHORIZED`             | 401         | Authentication required          |
| `INVALID_CREDENTIALS`      | 401         | Invalid credentials provided     |
| `TOKEN_EXPIRED`            | 401         | Authentication token has expired |
| `FORBIDDEN`                | 403         | Access denied                    |
| `INSUFFICIENT_PERMISSIONS` | 403         | Insufficient permissions         |
| `NOT_FOUND`                | 404         | Resource not found               |
| `CERTIFICATE_NOT_FOUND`    | 404         | Certificate not found            |
| `USER_NOT_FOUND`           | 404         | User not found                   |
| `DUPLICATE_RESOURCE`       | 409         | Resource already exists          |
| `VALIDATION_ERROR`         | 422         | Validation failed                |
| `INTERNAL_ERROR`           | 500         | Internal server error            |
| `DATABASE_ERROR`           | 500         | Database operation failed        |
| `BLOCKCHAIN_ERROR`         | 500         | Blockchain operation failed      |
| `IPFS_ERROR`               | 500         | IPFS operation failed            |
| `VERIFICATION_FAILED`      | 500         | Certificate verification failed  |
