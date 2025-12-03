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
    "referenceId": "STUD2023001",
    "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "candidateName": "John Doe",
    "courseName": "Advanced Computer Science",
    "institutionName": "Tech University",
    "issuedDate": "2023-06-15T15:30:45.123Z",
    "generationDate": "2023-06-15T15:30:45.123Z",
    "blockchainTxId": "0x1d3e...",
    "cryptographicSignature": "a1b2c3d4e5f6...",
    "ipfsHash": "QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd",
    "verificationCode": "ABCD",
    "revoked": false,
    "validUntil": "2028-05-15",
    "isExpired": false
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

#### 2.1 Generate Certificate

- **URL**: `/certificates/generate`
- **Method**: `POST`
- **Auth Required**: Yes
- **Description**: Generates a certificate for a candidate, uploads it to IPFS, registers on the blockchain, and stores in the database.
- **Query Parameters**:
  - `developer` (optional): Set to 'true' to include technical details in the certificate. Default is 'false'.
- **Request**:

```json
{
  "candidateName": "John Doe",
  "courseName": "Blockchain Security",
  "referenceId": "COURSE123-A",
  "institutionName": "Blockchain Academy",
  "cryptographicSignature": "0x8b7e88e8acdb23455b5aa378c8a48be96536736a9c3c12e2b752f0a712cba548",
  "certificateType": "ACHIEVEMENT",
  "validUntil": "2025-12-31",
  "recipientEmail": "john@example.com",
  "additionalMetadata": {
    "instructor": "Dr. Jane Smith",
    "totalHours": 120,
    "grade": "A+",
    "credits": 120
  }
}
```

**Required Parameters:**

- `candidateName` (string): The full name of the certificate recipient
- `courseName` (string): The name of the course or program completed

**Optional Parameters:**

- `referenceId` (string): An internal reference ID (default: auto-generated)
- `institutionName` (string): The name of the issuing institution (default: from user profile)
- `cryptographicSignature` (string): Digital signature of the issuing authority
- `certificateType` (string): Type of certificate - "ACHIEVEMENT", "COMPLETION", or "PARTICIPATION" (default: "ACHIEVEMENT")
  - `ACHIEVEMENT`: For outstanding performance or excellence in a course
  - `COMPLETION`: For successfully completing a course or program
  - `PARTICIPATION`: For attending or participating in a course or event
- `validUntil` (string): Expiration date of the certificate (YYYY-MM-DD). Omit this field completely if the certificate does not expire
- `recipientEmail` (string): Email address of the certificate recipient. If provided, the certificate will be automatically sent to this email.
- `additionalFields` (object, optional): Any additional data to be included in the certificate
- `developer` (boolean, optional): Set to 'true' to include technical details in the certificate. Default is 'false'.

**Response:**

```json
{
  "success": true,
  "message": "Certificate generated successfully",
  "certificate": {
    "referenceId": "STUD2023001",
    "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "candidateName": "John Doe",
    "courseName": "Advanced Computer Science",
    "institutionName": "Tech University",
    "issuedDate": "2023-06-15T15:30:45.123Z",
    "verificationCode": "ABCD",
    "blockchainTxId": "0x1d3e...",
    "cryptographicSignature": "a1b2c3d4e5f6...",
    "ipfsHash": "QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd",
    "status": "PENDING",
    "emailSent": false,
    "additionalFields": {
      "grade": "A+",
      "credits": 120
    }
  },
  "_links": {
    "pdf": "https://gateway.pinata.cloud/ipfs/QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd",
    "verify": "https://api.verifyhub.edu/certificates/8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1/verify"
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
- `institutionName` (string): Name of the issuing institution
- `courseName` (string, optional): Name of the course

**Response:**

```json
{
  "success": true,
  "status": "SUCCESS",
  "message": "Certificate uploaded and verified",
  "data": {
    "certificateId": "c1fb2bfc5c5de0bf63f0c44ae0fa1e1e69d32dbb4f3b0cd4fd76876960c4004d",
    "verificationCode": "AB9Z",
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

Verify a certificate by its full ID.

```http
GET /certificates/{certificateId}/verify
```

**Response:**

```json
{
  "success": true,
  "status": "VERIFIED",
  "message": "Certificate verified successfully",
  "verificationId": "ver_6b7a9c2d3e4f5g6h7i8j9k0l",
  "certificate": {
    "referenceId": "STUD2023001",
    "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "candidateName": "John Doe",
    "courseName": "Advanced Computer Science",
    "institutionName": "Tech University",
    "issuedDate": "2023-06-15T15:30:45.123Z",
    "generationDate": "2023-06-15T15:30:45.123Z",
    "blockchainTxId": "0x1d3e...",
    "cryptographicSignature": "a1b2c3d4e5f6...",
    "ipfsHash": "QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd",
    "verificationCode": "ABCD",
    "revoked": false,
    "validUntil": "2028-05-15",
    "isExpired": false
  },
  "_links": {
    "pdf": "https://gateway.pinata.cloud/ipfs/QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd",
    "blockchain": "https://mumbai.polygonscan.com/tx/0x1d3e..."
  },
  "blockchainVerified": true,
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

#### 2.4 Bulk Verify Certificates

Verify multiple certificates in a single request.

```http
POST /certificates/verify/bulk
Content-Type: application/json
```

**Request Body:**

```json
{
  "certificateIds": [
    "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "9672cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e2"
  ]
}
```

**Response:**

```json
{
  "success": true,
  "totalVerified": 2,
  "results": [
    {
      "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
      "status": "VERIFIED",
      "referenceId": "STUD2023001",
      "candidateName": "John Doe",
      "courseName": "Advanced Computer Science",
      "institutionName": "Tech University",
      "blockchainVerified": true,
      "verificationCode": "ABCD",
      "blockchainTxId": "0x1d3e..."
    },
    {
      "certificateId": "9672cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e2",
      "status": "VERIFIED",
      "referenceId": "STUD2023002",
      "candidateName": "Alice Johnson",
      "courseName": "Cybersecurity",
      "institutionName": "Tech University",
      "blockchainVerified": true,
      "verificationCode": "EFGH",
      "blockchainTxId": "0x2e4f..."
    }
  ],
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

#### 2.5 Verify Certificate by Verification Code

Verify a certificate using its verification code.

```http
GET /certificates/code/{verificationCode}
```

**Response:**

```json
{
  "success": true,
  "status": "VERIFIED",
  "message": "Certificate verified successfully",
  "verificationId": "ver_8562cb084288d618a070",
  "certificate": {
    "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "referenceId": "STUD2023001",
    "candidateName": "John Doe",
    "courseName": "Advanced Computer Science",
    "issuedDate": "2023-05-15T10:30:45.123Z",
    "institutionName": "Tech University",
    "institutionLogo": "https://example.com/logo.png",
    "verificationCode": "ABCD",
    "cryptographicSignature": "3046022100...",
    "blockchainLink": "https://etherscan.io/tx/0x1d3e...",
    "blockchainTxId": "0x1d3e...",
    "validUntil": "2028-05-15",
    "isExpired": false
  },
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

#### 2.6 Verify Certificate PDF

Verify a certificate by uploading the PDF file.

```http
POST /certificates/verify/pdf
```

**Request Body:**

```json
{
  "file": "Binary data (PDF file)"
}
```

**Response:**

```json
{
  "success": true,
  "status": "VERIFIED",
  "message": "Certificate verified successfully",
  "verificationId": "ver_8562cb084288d618a070",
  "certificate": {
    "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "referenceId": "STUD2023001",
    "candidateName": "John Doe",
    "courseName": "Advanced Computer Science",
    "issuedDate": "2023-05-15T10:30:45.123Z",
    "institutionName": "Tech University",
    "institutionLogo": "https://example.com/logo.png",
    "verificationCode": "ABCD",
    "cryptographicSignature": "3046022100...",
    "blockchainLink": "https://etherscan.io/tx/0x1d3e...",
    "blockchainTxId": "0x1d3e...",
    "validUntil": "2028-05-15",
    "isExpired": false
  },
  "timestamp": "2023-06-15T15:30:45.123Z"
}
```

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
- Filename for downloads: `certificate-{verificationCode or first 8 chars of certificateId}.pdf`

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
    "institutionName": "Tech University",
    "issuedDate": "2023-10-15T12:00:00.000Z",
    "hashes": {
      "ipfsHash": "QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd",
      "sha256Hash": "23f0d3298f57b2ff3f008696b07922526550bb241fd8ea338c50fcd32143e58d",
      "cidHash": "QmQkwxxoSneaPyWzGcZ3Zr5sXmCEKZeEPGaqLt87DA16DJ"
    },
    "verificationCode": "XY12",
    "status": "VALID",
    "_links": {
      "verification": "/api/certificates/8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1/verify",
      "verificationCode": "/api/certificates/code/XY12",
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

#### 2.11 Get Institution Certificates (Protected)

Get all certificates issued by a specific institution.

```http
GET /certificates/institution/:institutionName
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "status": "SUCCESS",
  "message": "Institution certificates retrieved",
  "data": {
    "institution": "Tech University",
    "totalCertificates": 28,
    "certificates": [
      {
        "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
        "candidateName": "Jane Smith",
        "courseName": "Blockchain Development",
        "issuedDate": "2023-10-15T12:00:00.000Z",
        "verificationCode": "XY12",
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
| `EXPIRED`            | Certificate has passed its expiration date             | `false`      |
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

## Certificate Lifecycle and Verification Process

### Certificate Status Flow

All certificates in the system follow a defined lifecycle:

1. **PENDING**: Initial state when certificate is first generated

   - Certificate is stored in database
   - PDF is generated and uploaded to IPFS
   - Certificate information is submitted to blockchain

2. **CONFIRMED**: Certificate is verified on the blockchain

   - System automatically polls the blockchain every 30 seconds
   - When transaction is confirmed, status is updated to CONFIRMED
   - Email notification is sent to recipient (if email provided)

3. **FAILED**: Certificate verification failed
   - If a PENDING certificate remains unverified after 15 minutes

### Blockchain Verification Process

The system implements a multi-layered verification process:

- **Transaction Receipt Verification**: Checks if the blockchain transaction is confirmed
- **Smart Contract Verification**: Uses multiple methods to check certificate existence:
  - `isVerified(certificateId)`: Direct verification method
  - `getCertificate(certificateId)`: Retrieves certificate data
  - `getCertificateDetails(certificateId)`: Retrieves detailed certificate information

### Email Notification System

The system automatically sends email notifications when certificates are confirmed on the blockchain:

#### Certificate Email Process

1. **Triggering**: Emails are automatically sent when:

   - A certificate transitions from PENDING to CONFIRMED status
   - A previously CONFIRMED certificate is found without email sent flag

2. **Polling Schedule**:

   - Every 30 seconds for first 10 minutes after certificate generation (20 checks)
   - Every 1 minute for ongoing verification and email sending
   - Immediate check on startup for any certificates needing emails

3. **Email Content**:
   - Personalized notification to the certificate recipient
   - Direct link to view the certificate PDF
   - Verification link to validate certificate authenticity
   - Certificate details (institution, course, issuance date)

#### Email Status Tracking

- `emailSent` flag in database tracks whether notification has been sent
- `emailSentAt` timestamp records when the email was delivered
- System ensures emails are only sent once per certificate

### Verification and Email Testing Endpoints

#### Test Email Sending

```http
POST /admin/send-confirmed-emails
Authorization: Bearer <token>
```

**Description**: Manually triggers the email sending process for testing purposes. This will find all CONFIRMED certificates that haven't had emails sent and process them.

**Response:**

```json
{
  "success": true,
  "message": "Email sending process initiated",
  "result": {
    "sent": 5,
    "failed": 0,
    "skipped": 0,
    "message": "5 confirmation emails sent"
  }
}
```

#### Send Test Email

```http
POST /email/test
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "recipient@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Test email sent successfully",
  "messageId": "abc123def456@smtp.gmail.com"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "SMTP_ERROR",
    "message": "Failed to connect to email server",
    "details": "Connection refused"
  }
}
```

#### Check Certificate Status

```http
GET /certificates/:certificateId/status
```

**Response:**

```json
{
  "success": true,
  "certificate": {
    "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "status": "CONFIRMED",
    "verificationCode": "ABCD",
    "emailSent": true,
    "emailSentAt": "2023-06-15T15:30:45.123Z",
    "verifiedAt": "2023-06-15T15:25:30.000Z",
    "blockchainTxId": "0x1d3e..."
  }
}
```

#### Get Certificate by ID

```http
GET /certificates/:certificateId
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "certificate": {
    "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "referenceId": "STUD2023001",
    "candidateName": "John Doe",
    "courseName": "Advanced Computer Science",
    "institutionName": "Tech University",
    "issuedDate": "2023-06-15T15:30:45.123Z",
    "status": "CONFIRMED",
    "blockchainTxId": "0x1d3e...",
    "ipfsHash": "QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd",
    "emailSent": true,
    "emailSentAt": "2023-06-15T15:45:30.000Z",
    "verificationCode": "ABCD",
    "_links": {
      "pdf": "https://gateway.pinata.cloud/ipfs/QmTQ6ieE6zdfCU2RSHG9DDELAtSACKtrf4C4PpjmGyZnWd",
      "verify": "/api/certificates/8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1/verify"
    }
  }
}
```

### 3. Email Notification API

#### 3.1 Resend Certificate Email

```http
POST /certificates/:certificateId/resend-email
Authorization: Bearer <token>
```

**Description**: Manually triggers resending of a certificate email notification.

**Response:**

```json
{
  "success": true,
  "message": "Certificate email resent successfully",
  "details": {
    "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "recipient": "john@example.com",
    "messageId": "abc123def456@smtp.gmail.com"
  }
}
```

#### 3.2 Update Recipient Email

```http
PATCH /certificates/:certificateId/recipient-email
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "newemail@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Recipient email updated successfully",
  "certificate": {
    "certificateId": "8562cb084288d618a070a7027e1483eb41cba91c44e3960525aa6cbbecc979e1",
    "recipientEmail": "newemail@example.com",
    "emailSent": false
  }
}
```
