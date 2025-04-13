import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// ========== ENHANCEMENT 1: Centralized configuration ==========
const config = {
  providerURL: process.env.PROVIDER_URL || 'http://localhost:8545',
  contractPaths: {
    abi: path.join(process.cwd(), 'build/contracts/Certification.json'),
    deployment: path.join(process.cwd(), 'build/contracts/deployment_config.json')
  },
  healthCheck: {
    retries: 3,
    retryDelay: 2000
  }
};

// ========== ENHANCEMENT 2: Better initialization handling ==========
let isInitialized = false;
let contract = null;
let web3 = null;

// ========== ENHANCEMENT 3: Robust ABI validation ==========
const verifyABI = (abi) => {
  const requiredMethods = {
    getCertificate: {
      inputs: [{ type: 'string' }],
      outputs: [
        { type: 'string' }, { type: 'string' }, { type: 'string' },
        { type: 'string' }, { type: 'string' }, { type: 'uint256' },
        { type: 'bool' }
      ]
    }
  };

  Object.entries(requiredMethods).forEach(([methodName, signature]) => {
    const method = abi.find(m =>
      m.name === methodName &&
      m.type === 'function' &&
      m.inputs?.every((input, i) => input.type === signature.inputs[i]?.type)
    );

    if (!method) {
      throw new Error(`Missing required method: ${methodName}`);
    }
  });
};

// ========== ENHANCEMENT 4: Async initialization with retries ==========
export const initializeBlockchain = async (retries = config.healthCheck.retries) => {
  try {
    web3 = new Web3(config.providerURL);

    // Load contract artifacts
    const { abi } = JSON.parse(fs.readFileSync(config.contractPaths.abi, 'utf8'));
    const { Certification: address } = JSON.parse(fs.readFileSync(config.contractPaths.deployment, 'utf8'));

    verifyABI(abi);
    contract = new web3.eth.Contract(abi, address);

    // Verify deployment
    const code = await web3.eth.getCode(address);
    if (code === '0x') throw new Error('Contract not deployed');

    isInitialized = true;
    console.log('Blockchain initialized successfully');
    return true;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retrying initialization... (${retries} left)`);
      await new Promise(res => setTimeout(res, config.healthCheck.retryDelay));
      return initializeBlockchain(retries - 1);
    }

    console.error('Blockchain initialization failed:', error.message);
    isInitialized = false;
    return false;
  }
};
// ========== ENHANCEMENT 5: Status-aware getters ==========
export const getWeb3 = () => {
  if (!web3) throw new Error('Web3 not initialized');
  return web3;
};

export const getContract = () => {
  if (!contract) throw new Error('Contract not initialized');
  return contract;
};

// ========== ENHANCEMENT 6: Comprehensive health check ==========
export const checkBlockchainStatus = async () => {
  try {
    if (!isInitialized) {
      return {
        connected: false,
        initialized: false,
        error: 'Blockchain client not initialized'
      };
    }

    // Node connectivity check
    const blockNumber = await web3.eth.getBlockNumber();

    // Contract deployment check
    const code = await web3.eth.getCode(contract.options.address);

    return {
      connected: true,
      initialized: true,
      nodeUrl: config.providerURL,
      contractAddress: contract.options.address,
      latestBlock: blockNumber,
      contractDeployed: code !== '0x'
    };
  } catch (error) {
    return {
      connected: false,
      initialized: isInitialized,
      error: error.message,
      nodeUrl: config.providerURL,
      contractAddress: contract?.options.address || 'N/A'
    };
  }
};

// ========== Backward compatibility ==========
// Maintain original export structure but also ensure initialization
// Don't directly export null values
export { getWeb3 as web3, getContract as contract };

// Initialize blockchain connection by default
initializeBlockchain().catch(err => {
  console.error('Failed to initialize blockchain on startup:', err.message);
});
