#!/usr/bin/env bash
set -e

echo "Waiting for ganache on ganache:8545 with a 60s timeout..."
/app/wait-for-it.sh ganache:8545 -t 60

echo "Ganache is up. Running Truffle compile..."
npx truffle compile --config truffle-config.cjs

echo "Running Truffle migration..."
npx truffle migrate --reset --network development --config truffle-config.cjs

echo "Migrations complete. Keeping container running..."
tail -f /dev/null
