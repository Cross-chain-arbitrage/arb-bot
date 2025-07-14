import { AlgebraV1_2PoolCreator } from './protocols/Algebra/AlgebraV1_2/PoolCreator'
import { AlgebraV1_9PoolCreator } from './protocols/Algebra/AlgebraV1_9/PoolCreator'
import { PancakeV2PoolCreator } from './protocols/Pancake/PancakeV2/PoolCreator'
import { PancakeV3PoolCreator } from './protocols/Pancake/PancakeV3/PoolCreator'
import { UniV2PoolCreator } from './protocols/Uni/UniV2/PoolCreator'
import { UniV3PoolCreator } from './protocols/Uni/UniV3/PoolCreator'
import { VelodromeV1PoolCreator } from './protocols/Velodrome/VelodromeV1/PoolCreator'
import { VelodromeV2PoolCreator } from './protocols/Velodrome/VelodromeV2/PoolCreator'

export const DexRegistry = {
	ALGEBRA_V1_9: new AlgebraV1_9PoolCreator(),
	VELODROME_V2: new VelodromeV2PoolCreator(),
	VELODROME_V1: new VelodromeV1PoolCreator(),
	ALGEBRA_V1_2: new AlgebraV1_2PoolCreator(),
	PANCAKE_V3: new PancakeV3PoolCreator(),
	UNI_V3: new UniV3PoolCreator(),
	PANCAKE_V2: new PancakeV2PoolCreator(),
	UNI_V2: new UniV2PoolCreator(),
} as const
