import {
	hemi,
	lightlinkPhoenix,
	fuse,
	story,
	rootstock,
	flowMainnet,
	mainnet,
} from 'viem/chains'
import { PoolType } from './dex/PoolUtils'
import { Pool } from './getArbitrageOpportunities'

export const poolsByChain: Record<number, Pool[]> = {
	// [apeChain.id]: [
	// 	// {
	// 	// 	type: PoolType.UNKNOWN,
	// 	// 	address: "0xbd04919285728923e298f898294319a84a0dbd1e",
	// 	// },
	// 	// {
	// 	// 	type: PoolType.UNKNOWN,
	// 	// 	address: '0xc82b890744d7df5f4fe28dd4205edcc36ceeea50',
	// 	// },
	// 	// {
	// 	// 	type: PoolType.UNKNOWN,
	// 	// 	address: "0x674843C06FF83502ddb4D37c2E09C01cdA38cbc8",
	// 	// },
	// 	// {
	// 	// 	type: PoolType.UNKNOWN,
	// 	// 	address: "0xf4D9235269a96aaDaFc9aDAe454a0618eBE37949",
	// 	// },
	// ],
	// [unichain.id]: [
	// 	// {
	// 	// 	type: PoolType.UNIV3,
	// 	// 	address:
	// 	// 		'0x3258f413c7a88cda2fa8709a589d221a80f6574f63df5a5b6774485d8acc39d9',
	// 	// },
	// ],
	[hemi.id]: [
		{
			type: PoolType.UNIV3,
			address: '0xdA44564DF732dECfd93Ba8539803C5a8dF241954',
		},
		{
			type: PoolType.UNIV3,
			address: '0x3EcabBa99bEF583B58b8f0af6dD853CD9ED75ce3',
		},
		{
			type: PoolType.UNIV3,
			address: '0x9580D4519C9F27642e21085E763E761a74eF3735',
		},
		{
			type: PoolType.UNIV3,
			address: '0x3e014A9EF5F45454d9BdDb15741ce8A04e7d96F5',
		},
		// Low liquidity
		// {
		// 	type: PoolType.UNIV3,
		// 	address: '0xB46335cAcCccb3fDC2A3F40D9Fd253F5F76919A0',
		// },
		{
			type: PoolType.UNIV3,
			address: '0xc36a310BD93E2927452de563fAAA89A86822a21f',
		},
	],
	[mainnet.id]: [
		{
			type: PoolType.UNIV2,
			address: '0x4ce3687fed17e19324f23e305593ab13bbd55c4d',
		},
	],
	[lightlinkPhoenix.id]: [
		{
			type: PoolType.UNIV3,
			address: '0x2288627C696010049f6D98a84fC10F9C5F7b3Ce2',
		},
		{
			type: PoolType.UNIV3,
			address: '0x1125452469E9B9A36FE69249309fCe8925C3eEDa',
		},
	],
	[fuse.id]: [
		{
			type: PoolType.ALGEBRA,
			address: '0x677409B2393E2ca19b454fB904F5E634E21D3D89',
		},
		{
			type: PoolType.ALGEBRA,
			address: '0x23518Ca19447E7ABB8C6f6eb215A1D663c53Ea21',
		},
		{
			type: PoolType.ALGEBRA,
			address: '0x5E174874C5bc45Ba96bD859A6edA4D34EE9f4424',
		},
		{
			type: PoolType.ALGEBRA,
			address: '0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6',
		},
		{
			type: PoolType.ALGEBRA,
			address: '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992',
		},
	],
	// Fetching errored because of different globalState return signature
	// [superposition.id]: [
	// {
	// 	type: PoolType.UNKNOWN,
	// 	address: '0x7FC956a5C0Aef46AA25b8911f4cb4619CbB7d90F',
	// },
	// {
	// 	type: PoolType.UNKNOWN,
	// 	address: '0x2b4EA69870659DE72e8Fd6De086Ad958a712349E',
	// },
	// {
	// 	type: PoolType.UNKNOWN,
	// 	address: '0xF401F9E336cD4FB11F33F4AFa81c7a40cfABf26e',
	// },
	// {
	// 	type: PoolType.UNKNOWN,
	// 	address: '0x7FC956a5C0Aef46AA25b8911f4cb4619CbB7d90F',
	// },
	// {
	// 	type: PoolType.UNKNOWN,
	// 	address: '0xC444d2219A7C6E39ffe467c2BFB6415060DC499C',
	// },
	// ],
	[story.id]: [
		{
			type: PoolType.UNIV3,
			address: '0x0012dc8daed76fd687b51ad6a4683aa151d3d59d',
		},
		{
			type: PoolType.UNIV3,
			address: '0x3dd013fddf4daa3b642a1538e274d85e8e54ae8b',
		},
	],
	[rootstock.id]: [
		{
			type: PoolType.UNIV3,
			address: '0xD022Cee10c5Cf25c50311c426536Eb8E313030b2',
		},
		// RIF/USDT pool
		// {
		// 	type: PoolType.UNIV3,
		// 	address: '0xa89a86d3d9481a741833208676fa57d0f1d5C6Cb',
		// },
		{
			type: PoolType.UNIV3,
			address: '0xE4Aad3D85ddc67cc2BB57599d27914C43DC89FE7',
		},
		{
			type: PoolType.UNIV3,
			address: '0xe54D5c25Aad95CDa8979eE502D4f3d70892444D1',
		},
		// USDRIF/USDT
		// {
		// 	type: PoolType.UNIV3,
		// 	address: '0x69c4D1FcD58CBDd7f9857aC4F8d56A1Cc6B598Fe',
		// },
		// MSTRs/USDT
		// {
		// 	type: PoolType.UNIV3,
		// 	address: '0xC7EBDeDc369858e7032Aa72833964b82f1fC1c31',
		// },
	],
	// Bullshit Etherscan instead of BlockScout
	// [taiko.id]: [
	// 	{
	// 		type: PoolType.UNIV3,
	// 		address: '0x7c38E9389B27668280E5aaAc372eBCb2ECc1c5E0',
	// 	},
	// 	{
	// 		type: PoolType.UNKNOWN,
	// 		address: '0xAc8f44ceCa92b2a4b30360E5bd3043850a0FFcbE',
	// 	},
	// 	{
	// 		type: PoolType.UNIV3,
	// 		address: '0xafEABAAbe0DFc504D56dFF53bf6b218BAFB76123',
	// 	},
	// ],
	// No supported pools
	// [flowMainnet.id]: [
	// 	{
	// 		type: PoolType.UNKNOWN, // CurveStableSwap
	// 		address: '0x20ca5d1C8623ba6AC8f02E41cCAFFe7bb6C92B57',
	// 	},
	// 	{
	// 		type: PoolType.UNKNOWN, // UniV2?
	// 		address: '0x681A3c23E7704e5c90e45ABf800996145a8096fD',
	// 	},
	// 	{
	// 		type: PoolType.UNKNOWN, // CurveTriCrypto
	// 		address: '0xff08315328040dA4Ca1bE88E1165E88abeA1C431',
	// 	},
	// ],
	// Fucking Black Market, tons of money, almost no verified pools (or they are proxies 💀)
	// [flare.id]: [
	// 	{
	// 		type: PoolType.UNIV3,
	// 		address: '0x0B40111B4Cf6dD1001F36f9c631956FefA56BC3b',
	// 	},
	// 	{
	// 		type: PoolType.UNIV3, // EnosysDexV3
	// 		address: '0xa4a4182219258c707253fdFD5C4aee2774c02C68',
	// 	},
	// 	{
	// 		type: PoolType.UNIV3, // BlazeSwap
	// 		address: '0xdF4b31b81D59EcA0CFc30ecb2beb36EAEbaf7A49',
	// 	},
	// 	{
	// 		type: PoolType.UNIV3, // Not verified
	// 		address: '0x8CD69c359806af83120bc4b4e77663f1E31553e7',
	// 	},
	// 	{
	// 		type: PoolType.UNIV3, // Not verified
	// 		address: '0x724bD6413925Dd4D513B35b1cf9c6f1C378e3691',
	// 	},
	// ],
}
