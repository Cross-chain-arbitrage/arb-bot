import { PancakeV2PoolCreator } from './PancakeV2/PoolCreator'
import { PancakeV3PoolCreator } from './PancakeV3/PoolCreator'
import { UniV2PoolCreator } from './UniV2/PoolCreator'
import { UniV3PoolCreator } from './UniV3/PoolCreator'

export const DexRegistry = {
	PANCAKE_V3: new PancakeV3PoolCreator(),
	UNI_V3: new UniV3PoolCreator(),
	UNI_V2: new UniV2PoolCreator(),
	PANCAKE_V2: new PancakeV2PoolCreator(),
	// PANCAKEV3: 'pancakeV3',
	// ALGEBRA: 'algebra',
	// ALGEBRA_V1_9: 'algebraV1_9',
	// VELODROME_V1: 'velodromeV1',
	// VELODROME_V2: 'velodromeV2',
} as const
