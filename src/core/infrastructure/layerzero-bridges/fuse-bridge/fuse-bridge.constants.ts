import { zeroAddress } from 'viem'
import { arbitrum, base, bsc, fuse, mainnet, optimism } from 'viem/chains'

export const FUSE_BRIDGE_SUPPORTED_CHAINS: number[] = [
	arbitrum.id,
	optimism.id,
	bsc.id,
	fuse.id,
	base.id,
	mainnet.id,
]

export const FUSE_BRIDGE_SUPPORTED_TOKENS = [
	{
		chainId: fuse.id,
		address: '0x34009565bfEeFded0F7e774629a745636Bf35E82',
		symbol: 'WBTC',
	},
	{
		chainId: arbitrum.id,
		address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
		symbol: 'WBTC',
	},
	{
		chainId: optimism.id,
		address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
		symbol: 'WBTC',
	},
	{
		chainId: bsc.id,
		address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
		symbol: 'WBTC',
	},
	{
		chainId: fuse.id,
		symbol: 'FUSE',
		address: zeroAddress,
	},
	{
		chainId: fuse.id,
		symbol: 'WFUSE',
		address: '0x0BE9e53fd7EDaC9F859882AfdDa116645287C629',
	},
	{
		chainId: bsc.id,
		symbol: 'FUSE',
		address: '0x5857c96dae9cf8511b08cb07f85753c472d36ea3',
	},
	{
		chainId: base.id,
		symbol: 'FUSE',
		address: '0x01facc69ec7360640aa5898e852326752801674a',
	},
	{
		chainId: mainnet.id,
		symbol: 'FUSE',
		address: '0x970b9bb2c0444f5e81e9d0efb84c8ccdcdcaf84d',
	},
] as const
