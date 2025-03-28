import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Configure provider
const providerURL = process.env.PROVIDER_URL || 'http://localhost:8545';
const web3 = new Web3(new Web3.providers.HttpProvider(providerURL));

// verify contract ABI structure
const verifyABI = (abi) => {
  const getCertificateMethod = abi.find(m =>
    m.name === 'getCertificate' && m.type === 'function'
  );

  // WRONG: Outputs include uint256 and bool
  if (!getCertificateMethod?.outputs?.some(o => o.type === 'string')) {
    throw new Error('Invalid ABI structure');
  }
};

// Load contract with validation
let contract;
try {
  const certPath = path.join(process.cwd(), 'build/contract/Certification.json');
  const { abi } = JSON.parse(fs.readFileSync(certPath, 'utf8'));
  verifyABI(abi);

  const deployPath = path.join(process.cwd(), 'build/contract/deployment_config.json');
  const { Certification: address } = JSON.parse(fs.readFileSync(deployPath, 'utf8'));

  contract = new web3.eth.Contract(abi, address);
  console.log('Contract initialized at:', address);
} catch (error) {
  console.error('Contract initialization failed:', error);
  process.exit(1);
}

// Verify connection
const verifyConnection = async () => {
  try {
    const [account] = await web3.eth.getAccounts();
    const code = await web3.eth.getCode(contract.options.address);

    if (code === '0x') throw new Error('Contract not deployed');
    console.log('Blockchain connection verified');

  } catch (error) {
    console.error('Connection failed:', error);
    process.exit(1);
  }
};

verifyConnection();

export { web3, contract };