#!/bin/bash
# Wait for Ganache to be available on port 8545
/app/wait-for-it.sh ganache:8545 -t 60
# Compile contracts using the CommonJS config
truffle compile --config truffle-config.cjs
# Migrate (deploy) contracts to Ganache
truffle migrate --reset --network development --config truffle-config.cjs
# Keep container running
tail -f /dev/null
