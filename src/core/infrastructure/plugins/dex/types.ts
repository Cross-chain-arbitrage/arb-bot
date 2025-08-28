import { PoolCreationParams } from '../../dex/pool-utils'
import { InterpolationParams } from '../shared-utils/interpolation-helper'

export interface DexConfig {
	pools: PoolCreationParams[]
	interpolationParams: InterpolationParams
}
