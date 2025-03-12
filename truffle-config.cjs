module.exports = {
  networks: {
    development: {
      host: "ganache",  // Docker service name
      port: 8545,
      network_id: "*",
      gas: 6721975
    }
  },
  compilers: {
    solc: {
      version: "^0.8.13"
    }
  }
};
