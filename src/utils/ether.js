// src/utils/ether.js
import { ethers } from 'ethers';
import axios from 'axios';

const INFURA_KEY = process.env.INFURA_KEY;
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';

export async function estimateCost(txRequest) {
  // v6: getDefaultProvider with Infura
  const provider = ethers.getDefaultProvider('homestead', {
    infura: INFURA_KEY
  });

  // 1. estimate gas (bigint) and fetch EIP-1559 fees (bigint) in parallel
  const [gasLimit, feeData] = await Promise.all([
    provider.estimateGas(txRequest),  // returns bigint
    provider.getFeeData()             // feeData.maxFeePerGas is bigint
  ]);

  const { maxFeePerGas, maxPriorityFeePerGas } = feeData;

  // 2. compute total fee in wei using native bigint multiplication
  const totalFeeWei = gasLimit * maxFeePerGas;

  // 3. convert to ETH (formatEther accepts bigint)
  const costEth = parseFloat(ethers.formatEther(totalFeeWei));

  // 4. fetch ETH→INR and compute INR cost
  const { data } = await axios.get(COINGECKO_URL, {
    params: { ids: 'ethereum', vs_currencies: 'inr' }
  });
  const ethInInr = data.ethereum.inr;
  const costInr = costEth * ethInInr;

  return {
    gasLimit: gasLimit.toString(),
    maxPriorityFeePerGas: maxPriorityFeePerGas?.toString() ?? 'n/a',
    maxFeePerGas: maxFeePerGas.toString(),
    costEth,
    costInr
  };
}
