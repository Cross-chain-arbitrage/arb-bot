import { InterpolationParams } from '../helpers/interpolation-helper'

export type RaydiumConfig = {
	edges: {
		from: string
		to: string
	}[]
	interpolationParams: InterpolationParams
}
