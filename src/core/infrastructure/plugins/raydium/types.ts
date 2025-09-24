import { TokenId } from '../../../domain/value-objects/token-id'
import { InterpolationParams } from '../shared-helpers/interpolation/interpolation-helper'

export type RaydiumConfig = {
	edges: {
		from: TokenId
		to: TokenId
	}[]
	interpolationParams: InterpolationParams
}
