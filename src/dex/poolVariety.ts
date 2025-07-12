import { UniV2PoolCreator } from './UniV2/PoolCreator'
import { UniV3PoolCreator } from './UniV3/PoolCreator'
export const DexRegistry = {
	UNIV3: new UniV3PoolCreator(),
	UNIV2: new UniV2PoolCreator(),
	// PANCAKEV2: 'pancakeV2',
	// PANCAKEV3: 'pancakeV3',
	// ALGEBRA: 'algebra',
	// ALGEBRA_V1_9: 'algebraV1_9',
	// VELODROME_V1: 'velodromeV1',
	// VELODROME_V2: 'velodromeV2',
} as const
