import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { PINATA_API_URL, PINATA_GATEWAY_BASE_URL } from '../constants.js';
import dotenv from 'dotenv';

dotenv.config();

const IPFS_GATEWAYS = [
  `${PINATA_GATEWAY_BASE_URL}/ipfs/`,
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/'
];

export const uploadToPinata = async (filePath) => {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

    const { data } = await axios.post(PINATA_API_URL, form, {
      maxBodyLength: Infinity,
      headers: {
        ...form.getHeaders(),
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET
      }
    });

    if (!data.IpfsHash?.startsWith('Qm')) {
      throw new Error('Invalid IPFS hash response');
    }

    console.log('IPFS Upload Successful:', data.IpfsHash);
    return data.IpfsHash;

  } catch (error) {
    console.error('IPFS Upload Failed:', error.response?.data || error.message);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
};

export const retrieveFromIPFS = async (ipfsHash) => {
  if (!ipfsHash?.startsWith('Qm')) {
    throw new Error('Invalid IPFS hash format');
  }

  for (const gateway of IPFS_GATEWAYS) {
    try {
      const url = `${gateway}${ipfsHash}`;
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000
      });

      if (response.status === 200 && response.data) {
        console.log('IPFS Retrieval Successful from:', gateway);
        return response.data;
      }
    } catch (error) {
      console.warn(`IPFS Gateway Failed [${gateway}]:`, error.message);
    }
  }

  throw new Error('All IPFS gateways failed');
};