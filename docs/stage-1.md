# 1st Stage

Choose 5 networks with ETH as native currency and find following data for each:

- Chain name & chainId
- DEX
- Pool
    - With USDT
    - With USDC
    - With ETH
    - With BTC
- RPC URL to interactively pull data from
- Scanner

For each pool following parameters should be determined

- Volume (24h, 7dm 30d)
- Swap amounts distribution
- Liquidity amount
- Address
- Pool type (UniV2, UniV3, Curve, Balancer, Velodrome, Algebra, etc.)

## Chains

### Hemi:

- Homepage: https://hemi.xyz/
- DEXes:
    - Sushi: https://www.sushi.com/hemi/swap
    - Passdex: https://passdex.finance/?chain=HEMI
- Explorer: https://explorer.hemi.xyz/
- Tokens:
    - USDT
    - USDC
- Pools:
    - USDC
        - Addresses (interconnected):
            - Actual token - https://explorer.hemi.xyz/token/0xad11a8BEb98bbf61dbb1aa0F6d6F2ECD87b35afA
            - Wrapper? - https://explorer.hemi.xyz/address/0x45f1A95A4D3f3836523F5c83673c797f4d4d263B
        - Pools (only OLD):
            - UniV3 - https://explorer.hemi.xyz/address/0xdA44564DF732dECfd93Ba8539803C5a8dF241954
            - UniV3 - https://explorer.hemi.xyz/address/0x3EcabBa99bEF583B58b8f0af6dD853CD9ED75ce3
            - UniV3 - https://explorer.hemi.xyz/address/0x9580D4519C9F27642e21085E763E761a74eF3735
            - UniV3 - https://explorer.hemi.xyz/address/0x3e014A9EF5F45454d9BdDb15741ce8A04e7d96F5
            - UniV3 - https://explorer.hemi.xyz/address/0xB46335cAcCccb3fDC2A3F40D9Fd253F5F76919A0
            - UniV3 - https://explorer.hemi.xyz/address/0xc36a310BD93E2927452de563fAAA89A86822a21f
            - IziSwapPool (?, under 10k in USDC liq) - https://explorer.hemi.xyz/address/0x6988E1f8c7Fde9b20ad9C1998EBE600A720da3e0
    - USDT:
        - Addresses:
            - Actual token - 0xbB0D083fb1be0A9f6157ec484b6C79E0A4e31C2e
            - Wrapper? - 0xAF54BE5B6eEc24d6BFACf1cce4eaF680A8239398
        - Pools (under 10k in USDT liq):
            - UniV3 - https://explorer.hemi.xyz/address/0xc36a310BD93E2927452de563fAAA89A86822a21f
            - UniV3 - https://explorer.hemi.xyz/address/0xf7A9F3523bCEC8311a14e1baf252d545bc3C8818

Identified arbitragers:

- https://explorer.hemi.xyz/tx/0x7aced2c8cf89e309167ae993ad1b2e7679b48e28151ae05aa54d6a8b0650661e
- https://explorer.hemi.xyz/address/0x961519b2C9D6524071B4f9111047160aE19AAD1e

### Fuse:

- Homepage: https://www.fuse.io/
- DEXes:
    - FluxSwap: https://fluxswap.io/
    - Voltage: https://voltage.finance/
    - PancakeSwap: https://pancakeswap.finance/swap
- Explorer: https://explorer.fuse.io/token/0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590?tab=holders
- Tokens:
    - ETH: https://explorer.fuse.io/token/0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590?tab=holders
    - USDC: https://explorer.fuse.io/token/0xc6Bc407706B7140EE8Eef2f86F9504651b63e7f9
    - USDT: https://explorer.fuse.io/token/0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7
- Pools:
    - USDC
        - Pools:
            - PegSwap - https://explorer.fuse.io/address/0xFa70dFFeA090fED2d6E9301fB10b0d4C81072E4c
            - AlgebraPool - https://explorer.fuse.io/address/0x677409B2393E2ca19b454fB904F5E634E21D3D89
    - USDT:
        - Pools:
            - Algebra - https://explorer.fuse.io/address/0x677409B2393E2ca19b454fB904F5E634E21D3D89
            - PegSwap - https://explorer.fuse.io/address/0xFa70dFFeA090fED2d6E9301fB10b0d4C81072E4c
            - Algebra - https://explorer.fuse.io/address/0x23518Ca19447E7ABB8C6f6eb215A1D663c53Ea21
            - Algebra - https://explorer.fuse.io/address/0x5E174874C5bc45Ba96bD859A6edA4D34EE9f4424
    - ETH:
        - Pools:
            - https://explorer.fuse.io/address/0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6
            - https://explorer.fuse.io/address/0xFa70dFFeA090fED2d6E9301fB10b0d4C81072E4c
            - https://explorer.fuse.io/address/0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992
            - https://explorer.fuse.io/address/0x51cC986Df4C54877E0Cd9122532db389cc60016B

**Identified Arbitragers:**

- https://explorer.fuse.io/address/0x57B814C00639E07EBd2b5a71A9ca5D55D02862E9?tab=txs

### Lightlink:

- Homepage: https://lightlink.io/ecosystem
- DEXes:
    - Elektrik: https://app.elektrik.network/
    - IceCream: https://icecreamswap.com/
    - PancakeSwap: https://pancakeswap.finance/swap
- Explorer: https://explorer.hemi.xyz/
- Tokens:
    - ETH:
    - USDC: https://phoenix.lightlink.io/token/0xbCF8C1B03bBDDA88D579330BDF236B58F8bb2cFd
    - USDT: https://explorer.fuse.io/token/0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7
- Pools:
    - USDC
        - Pools:
            - UniV3 (200k liq!) - https://phoenix.lightlink.io/address/0x2288627C696010049f6D98a84fC10F9C5F7b3Ce2
            - UniV3 - https://phoenix.lightlink.io/address/0x1125452469E9B9A36FE69249309fCe8925C3eEDa
    - USDT:
        - Pools:
            - UniV3 (200k liq!) - https://phoenix.lightlink.io/address/0x2288627C696010049f6D98a84fC10F9C5F7b3Ce2
            - PegSwap - https://explorer.fuse.io/address/0xFa70dFFeA090fED2d6E9301fB10b0d4C81072E4c
            - Algebra - https://explorer.fuse.io/address/0x23518Ca19447E7ABB8C6f6eb215A1D663c53Ea21
            - Algebra - https://explorer.fuse.io/address/0x5E174874C5bc45Ba96bD859A6edA4D34EE9f4424
    - ETH:
        - Pools:
            - Algebra - https://explorer.fuse.io/address/0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6
            - PegSwap - https://explorer.fuse.io/address/0xFa70dFFeA090fED2d6E9301fB10b0d4C81072E4c
            - Algebra - https://explorer.fuse.io/address/0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992
            - Algebra - https://explorer.fuse.io/address/0x51cC986Df4C54877E0Cd9122532db389cc60016B

### Degen:

- Homepage: https://www.degen.tips/
- DEXes:
    - Camelot: https://app.camelot.exchange/?chainId=666666666
    - ProxySwap: https://www.proxyswap.tips/
- Explorer: https://explorer.degen.tips/
- Tokens:
    - ETH (total supply 1 ETH): https://explorer.degen.tips/token/0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590
    - USDC (total supply 820 USDC): https://explorer.degen.tips/token/0xF1815bd50389c46847f0Bda824eC8da914045D14
    - USDT (total supply 554 USDT): https://explorer.degen.tips/token/0x674843C06FF83502ddb4D37c2E09C01cdA38cbc8

### Apechain:

- Homepage: https://apechain.com/
- DEXes:
    - Camelot: https://app.camelot.exchange/
    - Saru: https://saru.exchange/swap
    - PancakeSwap: https://pancakeswap.finance/swap
- Explorer: https://explorer.hemi.xyz/
- Tokens:
    - ETH (total supply 26 ETH ~ $48k): https://apescan.io/token/0xf4D9235269a96aaDaFc9aDAe454a0618eBE37949
    - USDC (TS 81k USDC): https://apescan.io/token/0xF1815bd50389c46847f0Bda824eC8da914045D14#balances
    - USDT (TS 15k USDT): https://apescan.io/token/0x674843C06FF83502ddb4D37c2E09C01cdA38cbc8
- Pools:
    - USDC
        - Pools:
            - Algebra - https://apescan.io/address/0xbd04919285728923e298f898294319a84a0dbd1e#code
            - Algebra - https://apescan.io/address/0xc82b890744d7df5f4fe28dd4205edcc36ceeea50
    - USDT:
        - Pools:
            - Algebra - https://apescan.io/token/0x674843C06FF83502ddb4D37c2E09C01cdA38cbc8?a=0xc82b890744d7df5f4fe28dd4205edcc36ceeea50
    - ETH:
        - Pools:
            - Algebra - https://apescan.io/token/0xf4D9235269a96aaDaFc9aDAe454a0618eBE37949?a=0x217076aa74eff7d54837d00296e9aebc8c06d4f2

### First Stage Status

Successful! I've been able to find opportunity and exploit it.

I've earned $25 in ETH, starting from $70 of initial investments, I've got $95.

It was arbitrage opportunity on WBTC/WETH pool with price difference of almost %5 compared to other chains with ETH being higher in price. With 10 iterations of bridging via stargate and sell/buys on Voltage Finance on Fuse and 1Inch on Optimism/Arbitrum, i have been able to profit! Even with manual arbitrage.

Also I've been able to spot opportunities on Hemi chain with WETH/USDC pool having 1.15% price difference.
