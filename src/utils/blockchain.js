// src/utils/blockchain.js
const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Connect to your blockchain provider (e.g., Ganache)
const providerURL = process.env.PROVIDER_URL || "http://127.0.0.1:8545";
const web3 = new Web3(providerURL);

// Load Certification contract ABI from build folder
const certificationJsonPath = path.join(__dirname, '../../build/contracts/Certification.json');
let contractABI = [];
try {
  const certificationData = JSON.parse(fs.readFileSync(certificationJsonPath, 'utf8'));
  contractABI = certificationData.abi;
} catch (error) {
  console.error('Error reading Certification contract ABI:', error);
}

// Get the contract address from deployment_config.json
const deploymentConfigPath = path.join(__dirname, '../../deployment_config.json');
let contractAddress = '';
try {
  const addressData = JSON.parse(fs.readFileSync(deploymentConfigPath, 'utf8'));
  contractAddress = addressData.Certification;
} catch (error) {
  console.error('Error reading deployment_config.json:', error);
}

// Create and export the contract instance
const contract = new web3.eth.Contract(contractABI, contractAddress);

module.exports = { web3, contract };
