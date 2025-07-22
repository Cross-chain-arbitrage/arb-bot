import { AlgebraV1_2PoolCreator } from './protocols/Algebra/AlgebraV1_2/PoolCreator'
import { AlgebraV1_9PoolCreator } from './protocols/Algebra/AlgebraV1_9/PoolCreator'
import { PancakeV2PoolCreator } from './protocols/Pancake/PancakeV2/PoolCreator'
import { PancakeV3PoolCreator } from './protocols/Pancake/PancakeV3/PoolCreator'
import { UniV2PoolCreator } from './protocols/Uni/UniV2/PoolCreator'
import { UniV3PoolCreator } from './protocols/Uni/UniV3/PoolCreator'
import { VelodromeV1PoolCreator } from './protocols/Velodrome/VelodromeV1/PoolCreator'
import { VelodromeV2PoolCreator } from './protocols/Velodrome/VelodromeV2/PoolCreator'

export const DexRegistry = {
	ALGEBRA_V1_9: AlgebraV1_9PoolCreator,
	VELODROME_V2: VelodromeV2PoolCreator,
	VELODROME_V1: VelodromeV1PoolCreator,
	ALGEBRA_V1_2: AlgebraV1_2PoolCreator,
	PANCAKE_V3: PancakeV3PoolCreator,
	UNI_V3: UniV3PoolCreator,
	PANCAKE_V2: PancakeV2PoolCreator,
	UNI_V2: UniV2PoolCreator,
} as const

export const DEX_REGISTRY_TOKEN = 'DEX_REGISTRY'
