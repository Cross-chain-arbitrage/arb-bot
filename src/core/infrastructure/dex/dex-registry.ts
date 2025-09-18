import { AlgebraV1_2PoolCreator } from './protocols/algebra/algebra-v1-2/algebra-v1-2-pool-creator'
import { AlgebraV1_9PoolCreator } from './protocols/algebra/algebra-v1-9/algebra-v1-9-pool-creator'
import { PancakeV2PoolCreator } from './protocols/pancake/pancake-v2/pancake-v2-pool-creator'
import { PancakeV3PoolCreator } from './protocols/pancake/pancake-v3/pancake-v3-pool-creator'
import { UniV2PoolCreator } from './protocols/uniswap/uniswap-v2/uniswap-v2-pool-creator'
import { UniV3PoolCreator } from './protocols/uniswap/uniswap-v3/uniswap-v3-pool-creator'
import { VelodromeV1PoolCreator } from './protocols/velodrome/velodrome-v1/velodrome-v1-pool-creator'
import { VelodromeV2PoolCreator } from './protocols/velodrome/velodrome-v2/velodrome-v2-pool-creator'

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
