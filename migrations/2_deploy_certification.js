const Certification = artifacts.require("Certification");
const fs = require('fs');
const path = require('path');

module.exports = async function (deployer) {
  await deployer.deploy(Certification);
  const deployedCertification = await Certification.deployed();

  const config = {
    Certification: deployedCertification.address
  };

  // Ensure the output directory exists
  const outputDir = path.join(__dirname, '../build/contract');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const configPath = path.join(outputDir, 'deployment_config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Certification contract deployed at address: ${deployedCertification.address}`);
};
