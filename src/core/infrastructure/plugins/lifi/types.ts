import { TokenId } from '../../../domain/value-objects/token-id'
import { InterpolationParams } from '../shared/helpers/interpolation/interpolation-helper'

export type LifiSnapshotConfig = {
	interpolationParams: InterpolationParams
}

export type LifiGraphConfig = {
	edges: {
		from: TokenId
		to: TokenId
	}[]
}
