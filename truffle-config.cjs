// truffle-config.cjs
module.exports = {
  networks: {
    development: {
      host: "ganache",
      port: 8545,
      network_id: "5777",
      gas: 6721975,
      gasPrice: 20000000000,
    }
  },
  compilers: {
    solc: {
      version: "0.8.13",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};