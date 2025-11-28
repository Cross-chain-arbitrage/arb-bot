import { PoolCreationParams } from '../../dex/pool-utils'
import { InterpolationParams } from '../shared/helpers/interpolation/interpolation-helper'

export interface DexSnapshotConfig {
	interpolationParams: InterpolationParams
}

export interface DexGraphConfig {
	pools: PoolCreationParams[]
}
