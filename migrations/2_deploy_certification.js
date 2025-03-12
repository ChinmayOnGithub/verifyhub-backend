const Certification = artifacts.require("Certification");
const fs = require('fs');
const path = require('path');

module.exports = async function (deployer) {
  // Deploy contract
  await deployer.deploy(Certification);
  const instance = await Certification.deployed();

  // Create build directory if not exists
  const buildDir = path.join(__dirname, '../build/contract');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // Write deployment config
  const config = {
    Certification: instance.address
  };

  fs.writeFileSync(
    path.join(buildDir, 'deployment_config.json'),
    JSON.stringify(config, null, 2)
  );

  console.log('Contract deployed at:', instance.address);
};