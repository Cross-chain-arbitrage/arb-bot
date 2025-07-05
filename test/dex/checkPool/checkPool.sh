#!/bin/bash

# Default values
CHECK_POOL_USE_ALCHEMY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
    --address)
        CHECK_POOL_POOL_ADDRESS="$2"
        shift 2
        ;;
    --chain-id)
        CHECK_POOL_CHAIN_ID="$2"
        shift 2
        ;;
    --use-alchemy)
        CHECK_POOL_USE_ALCHEMY=true
        shift
        ;;
    --type)
        CHECK_POOL_POOL_TYPE="$2"
        shift 2
        ;;
    --rpc-url)
        CHECK_POOL_RPC_URL="$2"
        shift 2
        ;;
    *)
        echo "Unknown option: $1"
        exit 1
        ;;
    esac
done

export CHECK_POOL_USE_ALCHEMY
export CHECK_POOL_POOL_ADDRESS
export CHECK_POOL_CHAIN_ID
export CHECK_POOL_RPC_URL
export CHECK_POOL=true
export CHECK_POOL_POOL_TYPE

yarn test:logs ./test/dex/checkPool/checkPool.test.ts --detectOpenHandles
