import { TokenId } from '../../../domain/value-objects/token-id'
import { InterpolationParams } from '../shared/helpers/interpolation/interpolation-helper'

export type RaydiumSnapshotConfig = {
	interpolationParams: InterpolationParams
}

export type RaydiumGraphConfig = {
	edges: {
		from: TokenId
		to: TokenId
	}[]
}
