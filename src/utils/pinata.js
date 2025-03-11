// src/utils/pinata.js
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { PINATA_API_URL } from '../constants.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Uploads a file to Pinata and returns the IPFS hash.
 */
export const uploadToPinata = async (filePath) => {
  try {
    const apiKey = process.env.PINATA_API_KEY;
    const apiSecret = process.env.PINATA_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new Error('Pinata API credentials not set in environment variables');
    }

    const data = new FormData();
    data.append('file', fs.createReadStream(filePath));

    const response = await axios.post(PINATA_API_URL, data, {
      maxContentLength: 'Infinity',
      headers: {
        ...data.getHeaders(),
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret
      }
    });

    if (response.data && response.data.IpfsHash) {
      console.log(`File uploaded to Pinata. IPFS Hash: ${response.data.IpfsHash}`);
      return response.data.IpfsHash;
    } else {
      console.error('Error uploading to Pinata:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Error in uploadToPinata:', error);
    return null;
  }
};
