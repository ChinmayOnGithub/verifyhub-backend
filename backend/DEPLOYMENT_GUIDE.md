# VerifyHub Deployment Guide

This guide explains how to deploy VerifyHub to different blockchain networks.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development (Ganache)](#local-development-ganache)
- [Sepolia Testnet](#sepolia-testnet)
- [Polygon Mumbai Testnet](#polygon-mumbai-testnet)
- [Polygon Mainnet (Production)](#polygon-mainnet-production)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- Node.js 18+ and npm
- Truffle: `npm install -g truffle`
- Git

### Required Accounts
- **Infura Account**: https://infura.io/ (for Ethereum networks)
- **Alchemy Account**: https://alchemy.com/ (for Polygon networks)
- **Pinata Account**: https://pinata.cloud/ (for IPFS storage)
- **MongoDB**: Local installation or MongoDB Atlas account

### Wallet Setup
- Create a new wallet or use existing one
- **IMPORTANT**: Use a separate wallet for development/testing
- Never use your main wallet with real funds for testing!

---

## Local Development (Ganache)

### Step 1: Install Dependencies
```bash
cd verifyhub-backend
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
BLOCKCHAIN_NETWORK=development
GANACHE_HOST=127.0.0.1
PROVIDER_URL=http://127.0.0.1:8545
MONGODB_URI=mongodb://localhost:27017/verifyhub
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
# ... other settings
```

### Step 3: Start Ganache

**Option A: Using Docker**
```bash
docker-compose up -d ganache
```

**Option B: Standalone Ganache**
```bash
# Install Ganache CLI
npm install -g ganache

# Start Ganache
ganache --wallet.deterministic --chain.hardfork=london --networkId=5777
```

### Step 4: Deploy Smart Contracts
```bash
truffle compile
truffle migrate --network development
```

### Step 5: Start Backend
```bash
npm run dev
```

### Step 6: Verify Deployment
- Backend should be running on http://localhost:3000
- Check `/api/health` endpoint
- Check `/api/status` for blockchain connection

---

## Sepolia Testnet

### Step 1: Get Testnet ETH
1. Visit https://sepoliafaucet.com/
2. Enter your wallet address
3. Request testnet ETH (you'll need ~0.1 ETH for deployment)

### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
BLOCKCHAIN_NETWORK=sepolia
PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Wallet Configuration
MNEMONIC=your twelve word mnemonic phrase goes here

# Infura
INFURA_PROJECT_ID=your_infura_project_id

# Other settings...
MONGODB_URI=mongodb://localhost:27017/verifyhub
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
```

### Step 3: Deploy Smart Contracts
```bash
# Compile contracts
truffle compile

# Deploy to Sepolia
truffle migrate --network sepolia

# Save the contract address from output!
```

### Step 4: Verify Contract on Etherscan
1. Go to https://sepolia.etherscan.io/
2. Search for your contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Follow the verification wizard

### Step 5: Start Backend
```bash
npm start
```

### Step 6: Test Certificate Generation
```bash
# Use Postman or curl to test
curl -X POST http://localhost:3000/api/certificates/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "candidateName": "Test User",
    "courseName": "Blockchain Development",
    "institutionName": "Test University"
  }'
```

---

## Polygon Mumbai Testnet

### Step 1: Get Testnet MATIC
1. Visit https://faucet.polygon.technology/
2. Select "Mumbai" network
3. Enter your wallet address
4. Request testnet MATIC

### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
BLOCKCHAIN_NETWORK=mumbai
PROVIDER_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# Wallet Configuration
MNEMONIC=your twelve word mnemonic phrase goes here

# Alchemy
ALCHEMY_API_KEY=your_alchemy_api_key

# Other settings...
MONGODB_URI=mongodb://localhost:27017/verifyhub
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
```

### Step 3: Deploy Smart Contracts
```bash
# Compile contracts
truffle compile

# Deploy to Mumbai
truffle migrate --network mumbai

# Save the contract address!
```

### Step 4: Verify Contract on PolygonScan
1. Go to https://mumbai.polygonscan.com/
2. Search for your contract address
3. Verify the contract (similar to Etherscan)

### Step 5: Start Backend
```bash
npm start
```

---

## Polygon Mainnet (Production)

### ⚠️ WARNING: This uses real MATIC! Test thoroughly on Mumbai first!

### Step 1: Prepare Production Wallet
1. Create a new wallet specifically for production
2. Fund it with MATIC (you'll need ~10-20 MATIC for deployment + operations)
3. **NEVER commit your mnemonic to Git!**

### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
NODE_ENV=production
BLOCKCHAIN_NETWORK=polygon
PROVIDER_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# Wallet Configuration (KEEP SECRET!)
MNEMONIC=your twelve word mnemonic phrase goes here

# Alchemy
ALCHEMY_API_KEY=your_alchemy_api_key

# Production MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/verifyhub

# Pinata
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Production Frontend
FRONTEND_URL=https://your-production-domain.com
```

### Step 3: Security Checklist
- [ ] Using a dedicated production wallet
- [ ] Mnemonic stored securely (not in code)
- [ ] Environment variables secured
- [ ] MongoDB Atlas configured with authentication
- [ ] SSL/TLS enabled for all connections
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] All API keys rotated from development

### Step 4: Deploy Smart Contracts
```bash
# Compile contracts
truffle compile

# DRY RUN first (no actual deployment)
truffle migrate --network polygon --dry-run

# If dry run looks good, deploy for real
truffle migrate --network polygon

# SAVE THE CONTRACT ADDRESS IMMEDIATELY!
```

### Step 5: Verify Contract on PolygonScan
1. Go to https://polygonscan.com/
2. Verify your contract
3. This builds trust with users

### Step 6: Deploy Backend
```bash
# Production deployment (example using PM2)
npm install -g pm2
pm2 start src/index.js --name verifyhub-backend
pm2 save
pm2 startup
```

### Step 7: Monitor Deployment
```bash
# Check logs
pm2 logs verifyhub-backend

# Check status
pm2 status

# Monitor resources
pm2 monit
```

---

## Network Switching

To switch between networks, simply update your `.env` file:

```env
# For local development
BLOCKCHAIN_NETWORK=development
PROVIDER_URL=http://127.0.0.1:8545

# For Sepolia testnet
BLOCKCHAIN_NETWORK=sepolia
PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# For Mumbai testnet
BLOCKCHAIN_NETWORK=mumbai
PROVIDER_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# For Polygon mainnet
BLOCKCHAIN_NETWORK=polygon
PROVIDER_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
```

Then restart your backend:
```bash
npm start
```

---

## Troubleshooting

### "Insufficient funds for gas"
**Problem**: Wallet doesn't have enough ETH/MATIC

**Solution**:
- For testnets: Get funds from faucets
- For mainnet: Add more MATIC to your wallet
- Check balance: The backend logs your wallet balance on startup

### "Contract not deployed"
**Problem**: Smart contract not found at expected address

**Solution**:
1. Check if `build/contracts/deployment_config.json` exists
2. Verify the contract address matches your network
3. Redeploy: `truffle migrate --network <network> --reset`

### "Network connection failed"
**Problem**: Can't connect to blockchain network

**Solution**:
1. Check your PROVIDER_URL in `.env`
2. Verify API keys (Infura/Alchemy)
3. Check network status:
   - Infura: https://status.infura.io/
   - Alchemy: https://status.alchemy.com/

### "Transaction timeout"
**Problem**: Transaction taking too long to confirm

**Solution**:
- Increase gas price in `truffle-config.cjs`
- Wait longer (mainnet can take minutes)
- Check transaction on block explorer

### "Invalid mnemonic"
**Problem**: Mnemonic phrase is incorrect

**Solution**:
1. Verify you copied the entire 12-word phrase
2. Check for extra spaces
3. Ensure words are in correct order
4. Generate new mnemonic if needed: https://iancoleman.io/bip39/

### "MongoDB connection failed"
**Problem**: Can't connect to database

**Solution**:
1. Check MongoDB is running: `mongod --version`
2. Verify MONGODB_URI in `.env`
3. For Atlas: Check IP whitelist and credentials

---

## Gas Cost Estimates

### Deployment Costs (approximate)
- **Ganache**: Free (unlimited gas)
- **Sepolia**: Free (testnet ETH)
- **Mumbai**: Free (testnet MATIC)
- **Polygon Mainnet**: ~5-10 MATIC (~$5-10 USD)

### Per Certificate Costs
- **Ganache**: Free
- **Sepolia**: Free (testnet)
- **Mumbai**: Free (testnet)
- **Polygon Mainnet**: ~0.01-0.05 MATIC (~$0.01-0.05 USD)

---

## Best Practices

### Development
1. Always test on Ganache first
2. Then test on Mumbai/Sepolia
3. Never test on mainnet!

### Security
1. Use separate wallets for dev/staging/production
2. Never commit `.env` file
3. Rotate API keys regularly
4. Use environment-specific MongoDB databases
5. Enable 2FA on all service accounts

### Monitoring
1. Set up alerts for low wallet balance
2. Monitor transaction failures
3. Track gas costs
4. Log all certificate generations
5. Set up uptime monitoring

### Backup
1. Backup MongoDB regularly
2. Save contract addresses and ABIs
3. Document deployment configurations
4. Keep deployment logs

---

## Support

### Resources
- Truffle Docs: https://trufflesuite.com/docs/
- Infura Docs: https://docs.infura.io/
- Alchemy Docs: https://docs.alchemy.com/
- Polygon Docs: https://docs.polygon.technology/

### Getting Help
- Check logs: `pm2 logs` or `npm run dev`
- Test endpoints: `/api/health` and `/api/status`
- Verify contract on block explorer
- Check wallet balance

---

## Quick Reference

### Useful Commands
```bash
# Compile contracts
truffle compile

# Deploy to network
truffle migrate --network <network>

# Reset and redeploy
truffle migrate --network <network> --reset

# Run tests
truffle test

# Check wallet balance
truffle console --network <network>
> web3.eth.getBalance("YOUR_ADDRESS")

# Start backend
npm start

# Start backend (development)
npm run dev
```

### Network URLs
- Sepolia Faucet: https://sepoliafaucet.com/
- Mumbai Faucet: https://faucet.polygon.technology/
- Sepolia Explorer: https://sepolia.etherscan.io/
- Mumbai Explorer: https://mumbai.polygonscan.com/
- Polygon Explorer: https://polygonscan.com/

---

## Conclusion

Your VerifyHub backend is now production-ready! You can:
- ✅ Run locally on Ganache for development
- ✅ Deploy to Sepolia/Mumbai for testing
- ✅ Deploy to Polygon mainnet for production
- ✅ Switch networks by changing configuration
- ✅ Monitor and manage deployments

The smart contract code is identical across all networks - only the configuration changes!
