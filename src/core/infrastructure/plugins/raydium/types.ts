import { InterpolationParams } from '../shared-helpers/interpolation/interpolation-helper'

export type RaydiumConfig = {
	edges: {
		from: string
		to: string
	}[]
	interpolationParams: InterpolationParams
}
