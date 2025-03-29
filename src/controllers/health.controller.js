// src/controllers/health.controller.js
import { checkBlockchainStatus } from '../utils/blockchain.js';
import mongoose from 'mongoose';

export const checkHealth = async (req, res) => {
  try {
    const blockchainStatus = await checkBlockchainStatus();
    const dbStatus = mongoose.connection.readyState === 1;

    const status = {
      services: {
        blockchain: {
          ...blockchainStatus,
          status: blockchainStatus.connected ? 'OK' : 'DOWN'
        },
        database: {
          status: dbStatus ? 'OK' : 'DOWN',
          host: mongoose.connection.host || 'N/A'
        }
      },
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    };

    const allServicesOK = blockchainStatus.connected && dbStatus;
    res.status(allServicesOK ? 200 : 503).json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Health check failed',
      details: error.message
    });
  }
};