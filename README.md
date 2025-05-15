# Probabilistic Cross-Chain Arbitrage

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

## Devs

- 0xCompose
- semidol
