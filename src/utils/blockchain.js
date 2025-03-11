// src/utils/blockchain.js
import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Connect to blockchain provider (e.g., Ganache)
const providerURL = process.env.PROVIDER_URL || 'http://127.0.0.1:8545';
const web3 = new Web3(providerURL);

// Load Certification contract ABI
const certificationJsonPath = path.join(process.cwd(), 'build/contract/Certification.json');
let contractABI = [];
try {
  const certificationData = JSON.parse(fs.readFileSync(certificationJsonPath, 'utf8'));
  contractABI = certificationData.abi;
} catch (error) {
  console.error('Error reading Certification contract ABI:', error);
}

// Get contract address from deployment_config.json
const deploymentConfigPath = path.join(process.cwd(), 'build/contract/deployment_config.json');
let contractAddress = '';
try {
  const addressData = JSON.parse(fs.readFileSync(deploymentConfigPath, 'utf8'));
  contractAddress = addressData.Certification;
} catch (error) {
  console.error('Error reading deployment_config.json:', error);
}

// Create contract instance
const contract = new web3.eth.Contract(contractABI, contractAddress);

export { web3, contract };
