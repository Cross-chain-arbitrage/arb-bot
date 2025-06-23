import { ALGEBRA_POOL_ABI } from '../abi/algebra/algebraPool'
import { PANCAKE_V3_POOL_ABI } from '../abi/pancakeV3/pancakeV3Pool'
import { UNIV2_POOL_ABI } from '../abi/uniV2/pool'
import { UNIV3_POOL_ABI } from '../abi/uniV3/uniV3Pool'

export enum PoolType {
	UNIV3 = 'uniV3',
	UNIV2 = 'uniV2',
	PANCAKEV2 = 'pancakeV2',
	PANCAKEV3 = 'pancakeV3',
	ALGEBRA = 'algebra',
}

export const POOL_CONFIGS: Record<PoolType, PoolConfig> = {
	[PoolType.UNIV3]: {
		type: 'v3-like',
		abi: UNIV3_POOL_ABI,
		slotFunction: 'slot0',
		slotTickSpacingIndex: 1,
		feeFunction: 'fee',
		tokenFunctions: {
			token0: 'token0',
			token1: 'token1',
		},
	},
	[PoolType.PANCAKEV3]: {
		type: 'v3-like',
		abi: PANCAKE_V3_POOL_ABI,
		slotFunction: 'slot0',
		slotTickSpacingIndex: 1,
		feeFunction: 'fee',
		tokenFunctions: {
			token0: 'token0',
			token1: 'token1',
		},
	},
	[PoolType.ALGEBRA]: {
		type: 'v3-like',
		abi: ALGEBRA_POOL_ABI,
		slotFunction: 'globalState',
		slotTickSpacingIndex: 1,
		feeFunction: 'fee',
		tokenFunctions: {
			token0: 'token0',
			token1: 'token1',
		},
	},
	[PoolType.UNIV2]: {
		type: 'v2-like',
		abi: UNIV2_POOL_ABI,
		defaultFee: 30, // 0.3%
		tokenFunctions: {
			token0: 'token0',
			token1: 'token1',
		},
	},
	[PoolType.PANCAKEV2]: {
		type: 'v2-like',
		abi: UNIV2_POOL_ABI,
		defaultFee: 25, // 0.25%
		tokenFunctions: {
			token0: 'token0',
			token1: 'token1',
		},
	},
}
