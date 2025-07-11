import { UniV2PoolCreator } from './UniV2/PoolCreator'

export const DexRegistry = {
	// UNIV3: 'uniV3',
	UNIV2: new UniV2PoolCreator(),
	// PANCAKEV2: 'pancakeV2',
	// PANCAKEV3: 'pancakeV3',
	// ALGEBRA: 'algebra',
	// ALGEBRA_V1_9: 'algebraV1_9',
	// VELODROME_V1: 'velodromeV1',
	// VELODROME_V2: 'velodromeV2',
} as const
