# Cross Chain Arbitrage

This method utilizes Stargate's Hydra chains to have slippageless bridges and universal USDT/USDC/ETH deployments on every chain

The goal for the this project is to organize arbitrage of stablecoins and (or) ETH on each chain.

Bot(s) MUST be deployed to many chains in parallel to capture all opportunities to identify chains with best opportunities and least competition.

Current list of supported Hydra chains (30.04.2025) includes 26 networks (full list in [chains.json](./data/chains.json))

## How it's going (will be going)

[1st Stage](./docs/stage-1.md) - PoC
[2nd Stage](./docs/stage-2.md) - PoC automated (current)
3nd Stage - First Version (TBP)

## Test

Run all test without logs

```bash
yarn test
```

Run all test with logs

```bash
yarn test:logs
```

To add new test suite, create new file in `test` folder and export function that will be passed to `makeSuite` in `_index.test.ts` file.

## Check Pool

The `checkPool` tool lets you quickly test if a DEX pool works on a specific chain. It checks if swaps between the pool's tokens are working as expected.

### How to use

Run this command:

```bash
yarn check-pool --address <POOL_ADDRESS> --chain-id <CHAIN_ID> --type <POOL_TYPE> [--use-alchemy] [--rpc-url <RPC_URL>]
```

- `--address`: Pool contract address (required)
- `--chain-id`: Network chain ID (required)
- `--type`: Pool type (required). Supported values: `uniV3`, `uniV2`, `pancakeV2`, `pancakeV3`, `algebra`
- `--use-alchemy`: Use Alchemy RPC (optional, do not use with --rpc-url)
- `--rpc-url`: Custom RPC URL (optional, do not use with --use-alchemy)

### Example

Check a Pancake V3 pool on BNB Chain (chain ID 56) using Alchemy RPC:

```bash
yarn check-pool --address 0x172fcd41e0913e95784454622d1c3724f546f849 --chain-id 56 --use-alchemy --type pancakeV3
```

## Devs

- 0xCompose
- semidol

```

```
