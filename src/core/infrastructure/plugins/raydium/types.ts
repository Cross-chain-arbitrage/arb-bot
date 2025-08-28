import { InterpolationParams } from '../shared-utils/interpolation-helper'

export type RaydiumConfig = {
	edges: {
		from: string
		to: string
	}[]
	interpolationParams: InterpolationParams
}
