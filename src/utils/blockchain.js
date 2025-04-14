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

// ========== NEW FEATURE: Certificate verification event listener ==========
/**
 * Sets up a certificate verification system
 * Uses polling instead of subscriptions for maximum compatibility
 */
export const startCertificateConfirmationListener = async () => {
  try {
    if (!isInitialized || !contract) {
      console.error('Cannot start listener: Blockchain not initialized');
      return false;
    }

    // Import mongoose models - safely
    let Certificate;
    try {
      const mongoose = await import('../models/certificate.model.js');
      Certificate = mongoose.default || mongoose.Certificate;

      if (!Certificate) {
        throw new Error('Certificate model not found');
      }
    } catch (modelError) {
      console.error('⛔ Error loading Certificate model:', modelError.message);
      return false;
    }

    console.log('Starting blockchain certificate verification system...');

    // Check which events are available in the contract ABI
    const contractABI = contract._jsonInterface;
    const availableEvents = contractABI
      .filter(item => item.type === 'event')
      .map(item => item.name);

    console.log(`Available contract events: ${availableEvents.join(', ') || 'None found'}`);

    // Set up polling instead of subscriptions
    console.log('Setting up polling-based verification (no subscriptions required)');

    // Setup interval for periodic checks (every 2 minutes)
    const interval = setInterval(async () => {
      try {
        const count = await checkAndUpdateCertificates(Certificate);
        console.log(`Periodic check complete: ${count.updated} certificates updated, ${count.failed} failed`);
      } catch (err) {
        console.error('Error in periodic certificate check:', err.message);
      }
    }, 2 * 60 * 1000); // Every 2 minutes

    // Make sure interval is cleaned up if app shuts down
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('Certificate verification polling stopped');
    });

    // Initial check
    setTimeout(async () => {
      try {
        console.log('Running initial certificate verification check...');
        const count = await checkAndUpdateCertificates(Certificate);
        console.log(`Initial check complete: ${count.updated} certificates updated`);
      } catch (err) {
        console.error('Error in initial certificate check:', err.message);
      }
    }, 5000); // 5 seconds after start

    console.log('📡 Certificate verification system started');
    return true;
  } catch (error) {
    console.error('Failed to start certificate verification system:', error.message);
    // Don't let this error stop the application
    return false;
  }
};

/**
 * Helper function to check and update certificates
 * Used by both the listener and periodic updates
 */
async function checkAndUpdateCertificates(Certificate, limit = null) {
  try {
    // Find all PENDING certificates
    const query = Certificate.find({ status: 'PENDING' }).sort({ createdAt: -1 });

    // Apply limit if provided
    if (limit) {
      query.limit(limit);
    }

    const pendingCertificates = await query;
    console.log(`Found ${pendingCertificates.length} pending certificates to check`);

    if (pendingCertificates.length === 0) {
      return { updated: 0, failed: 0 };
    }

    // Get available methods
    const methods = Object.keys(contract.methods || {});

    let updatedCount = 0;
    let failedCount = 0;

    for (const cert of pendingCertificates) {
      try {
        // Skip certificates without certificateId - they're invalid
        if (!cert.certificateId) {
          console.log(`⚠️ Certificate without ID found, skipping`);
          continue;
        }

        console.log(`Checking certificate: ${cert.certificateId}`);

        // First check by transaction receipt if available
        if (cert.blockchainTx) {
          try {
            const receipt = await web3.eth.getTransactionReceipt(cert.blockchainTx);
            if (receipt && receipt.blockNumber) {
              // Transaction confirmed, update to CONFIRMED
              await Certificate.updateOne(
                { _id: cert._id },
                {
                  $set: {
                    status: 'CONFIRMED',
                    updatedAt: new Date()
                  }
                }
              );
              updatedCount++;
              console.log(`✅ Certificate ${cert.certificateId} confirmed via transaction receipt`);
              continue; // Skip to next cert
            }
          } catch (err) {
            // Just log and continue to other verification methods
            console.log(`Transaction check failed: ${err.message}`);
          }
        }

        // Try verification methods in order of reliability
        let isVerified = false;

        // METHOD 1: isVerified
        if (!isVerified && methods.includes('isVerified')) {
          try {
            isVerified = await contract.methods.isVerified(cert.certificateId).call();
            if (isVerified) {
              console.log(`Verified via isVerified: ${cert.certificateId}`);
            }
          } catch (err) {
            // Just log and continue
          }
        }

        // METHOD 2: getCertificate
        if (!isVerified && methods.includes('getCertificate')) {
          try {
            await contract.methods.getCertificate(cert.certificateId).call();
            // If no error, cert exists
            isVerified = true;
            console.log(`Verified via getCertificate: ${cert.certificateId}`);
          } catch (err) {
            // Just log and continue
          }
        }

        // METHOD 3: getCertificateDetails
        if (!isVerified && methods.includes('getCertificateDetails')) {
          try {
            await contract.methods.getCertificateDetails(cert.certificateId).call();
            // If no error, cert exists
            isVerified = true;
            console.log(`Verified via getCertificateDetails: ${cert.certificateId}`);
          } catch (err) {
            // Just log and continue
          }
        }

        // Update cert status based on verification
        if (isVerified) {
          await Certificate.updateOne(
            { _id: cert._id },
            {
              $set: {
                status: 'CONFIRMED',
                updatedAt: new Date()
              }
            }
          );
          updatedCount++;
          console.log(`✅ Certificate ${cert.certificateId} verified and updated to CONFIRMED`);
        } else {
          // Mark as FAILED if older than 15 minutes
          const fifteenMinutesAgo = new Date(Date.now() - (15 * 60 * 1000));
          if (cert.createdAt < fifteenMinutesAgo) {
            await Certificate.updateOne(
              { _id: cert._id },
              {
                $set: {
                  status: 'FAILED',
                  updatedAt: new Date()
                }
              }
            );
            failedCount++;
            console.log(`❌ Certificate ${cert.certificateId} marked as FAILED (too old)`);
          }
        }
      } catch (err) {
        console.error(`Error processing certificate: ${err.message}`);
      }
    }

    return { updated: updatedCount, failed: failedCount };
  } catch (error) {
    console.error('Error in certificate checking:', error.message);
    return { updated: 0, failed: 0 };
  }
}

// Simplified version that uses the shared helper function
export const updatePendingCertificates = async (limit = null) => {
  try {
    if (!isInitialized || !contract) {
      console.error('Cannot update pending certificates: Blockchain not initialized');
      return false;
    }

    // Import mongoose models safely
    let Certificate;
    try {
      const mongoose = await import('../models/certificate.model.js');
      Certificate = mongoose.default || mongoose.Certificate;

      if (!Certificate) {
        throw new Error('Certificate model not found');
      }
    } catch (modelError) {
      console.error('⛔ Error loading Certificate model:', modelError.message);
      return false;
    }

    console.log('Checking for pending certificates that need status update...');

    // Use the shared helper function
    const results = await checkAndUpdateCertificates(Certificate, limit);

    console.log(`Updated ${results.updated} certificates to CONFIRMED status and ${results.failed} to FAILED status`);
    return true;
  } catch (error) {
    console.error('Failed to update pending certificates:', error.message);
    // Don't crash the app
    return false;
  }
};
