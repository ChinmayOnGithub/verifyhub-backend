module.exports = {
  networks: {
    development: {
      host: "127.0.0.1", // Adjust if needed; if running via Docker, use the service name "ganache"
      port: 8545,
      network_id: "*"    // Match any network id
    }
  },
  compilers: {
    solc: {
      version: "0.8.13"
    }
  },
  contracts_build_directory: "./build/contract"
};
