export const module = {
    networks: {
      development: {
        host: "ganache",         // Docker service name or IP if running locally
        port: 8545,
        network_id: "*",         // Match any network id
        gas: 6721975
      }
    },
    compilers: {
      solc: {
        version: "^0.8.13"
      }
    }
  };
  