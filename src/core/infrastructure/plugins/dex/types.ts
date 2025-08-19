import { PoolCreationParams } from '../../dex/pool-utils'
import { InterpolationParams } from '../helpers/interpolation-helper'

export interface DexConfig {
	pools: PoolCreationParams[]
	interpolationParams: InterpolationParams
}
