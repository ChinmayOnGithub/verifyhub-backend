// using ethers.js
import { ethers } from "ethers";

async function estimateCost(txRequest) {
  const provider = new ethers.providers.InfuraProvider("homestead", INFURA_KEY);

  // 1) Estimate gas units
  const gasLimit = await provider.estimateGas(txRequest);

  // 2) Get fee data (base fee + maxPriorityFee)
  const feeData = await provider.getFeeData();
  // feeData.maxFeePerGas includes baseFee+tip

  // 3) Compute total cost in wei
  const totalGasFee = gasLimit.mul(feeData.maxFeePerGas);

  // 4) Convert to ether for readability
  const costInEth = ethers.utils.formatEther(totalGasFee);
  console.log(`Estimated cost: ${costInEth} ETH`);
  return costInEth;
}

// Example usage: sending 0.1 ETH to Bob
estimateCost({
  to: "0xBobAddress…",
  value: ethers.utils.parseEther("0.1")
});
