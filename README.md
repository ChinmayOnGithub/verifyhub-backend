# VerifyHub

A blockchain-based certificate verification platform that enables institutions to issue and verify tamper-proof digital certificates.

## Overview

VerifyHub provides a secure way to issue, store, and verify educational certificates using blockchain technology and IPFS storage. Certificates are cryptographically signed and stored on the Ethereum blockchain, ensuring authenticity and preventing fraud.

## Features

- Blockchain-secured certificate issuance and verification
- Decentralized storage using IPFS
- Real-time certificate status updates
- Institution branding with custom logos
- Multi-network support (Ganache, Sepolia, Polygon, Ethereum)
- QR code verification
- RESTful API

## Technology Stack

**Backend**
- Node.js with Express
- MongoDB
- Web3.js and Truffle
- Socket.IO
- PDFKit

**Frontend**
- React 19
- Vite
- Tailwind CSS
- Axios

## Project Structure

```
VerifyHub/
├── backend/     # Node.js backend
├── frontend/    # React frontend
└── docs/        # Documentation
```

## Getting Started

### Prerequisites

- Node.js v20+
- MongoDB
- Ganache (for local development)

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```
   cd backend && npm install
   ```
3. Install frontend dependencies:
   ```
   cd frontend && npm install
   ```
4. Configure environment variables (see `.env.example` files)
5. Start Ganache and deploy smart contracts:
   ```
   cd backend && npx truffle migrate
   ```
6. Start the backend server:
   ```
   cd backend && npm start
   ```
7. Start the frontend:
   ```
   cd frontend && npm run dev
   ```

## Documentation

- [API Documentation](backend/API_DOCUMENTATION.md)
- [Deployment Guide](backend/DEPLOYMENT_GUIDE.md)

## License

MIT License
