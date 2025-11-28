import { TokenId } from '../../../domain/value-objects/token-id'
import { InterpolationParams } from '../shared/helpers/interpolation/interpolation-helper'

export type JupiterSnapshotConfig = {
	interpolationParams: InterpolationParams
}

export type JupiterGraphConfig = {
	edges: {
		from: TokenId
		to: TokenId
	}[]
}
