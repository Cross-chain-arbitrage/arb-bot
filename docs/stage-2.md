# 2nd Stage

From the first stage Fuse chain showed up as the most promising for cross-chain arbitrage. There 2 bridges available - canonical & Stargate, both implement LZ, which is pretty handy

We already proofed an opportunity by manual labor, now machines must start their part 🤖

We're planning to implement following functional modules:

-   Swap on Algebra Pool
-   Swap on Uniswap Pool
-   Bridge via Canonical Bridge or Stargate (canonical tokens has more liquidity on Fuse chain, but can have limitations on bridging to other chains)
-   Pools Price Monitoring

## Chains

For origin chain we will use Fuse chain and we will try to pair it with:

-   Arbitrum
-   Optimism
-   Base
-   BSC
-   Ethereum?

## Pool Discovery

We will be exploring pools on chains listed above using:

-   CoinMarketCap
-   GeckoTerminal

## Price discovery

Price discovery will be implemented via direct calls to pool contracts

## Fuse Chain Specs:

-   Homepage: https://www.fuse.io/
-   DEXes:
    -   FluxSwap: https://fluxswap.io/
    -   Voltage: https://voltage.finance/
    -   PancakeSwap: https://pancakeswap.finance/swap
-   Explorer: https://explorer.fuse.io/token/0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590?tab=holders
-   Tokens:
    -   ETH: https://explorer.fuse.io/token/0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590?tab=holders
    -   USDC: https://explorer.fuse.io/token/0xc6Bc407706B7140EE8Eef2f86F9504651b63e7f9
    -   USDT: https://explorer.fuse.io/token/0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7
-   Pools:
    -   USDC
        -   Pools:
            -   PegSwap - https://explorer.fuse.io/address/0xFa70dFFeA090fED2d6E9301fB10b0d4C81072E4c
            -   AlgebraPool - https://explorer.fuse.io/address/0x677409B2393E2ca19b454fB904F5E634E21D3D89
    -   USDT:
        -   Pools:
            -   Algebra - https://explorer.fuse.io/address/0x677409B2393E2ca19b454fB904F5E634E21D3D89
            -   PegSwap - https://explorer.fuse.io/address/0xFa70dFFeA090fED2d6E9301fB10b0d4C81072E4c
            -   Algebra - https://explorer.fuse.io/address/0x23518Ca19447E7ABB8C6f6eb215A1D663c53Ea21
            -   Algebra - https://explorer.fuse.io/address/0x5E174874C5bc45Ba96bD859A6edA4D34EE9f4424
    -   ETH:
        -   Pools:
            -   https://explorer.fuse.io/address/0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6
            -   https://explorer.fuse.io/address/0xFa70dFFeA090fED2d6E9301fB10b0d4C81072E4c
            -   https://explorer.fuse.io/address/0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992
            -   https://explorer.fuse.io/address/0x51cC986Df4C54877E0Cd9122532db389cc60016B

**Identified Arbitragers:**

-   https://explorer.fuse.io/address/0x57B814C00639E07EBd2b5a71A9ca5D55D02862E9?tab=txs

### Conclusion

TBD
