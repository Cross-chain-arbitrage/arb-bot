export type RaydiumConfig = {
	edges: {
		from: string
		to: string
	}[]
}

export type InterpolationParams = {
	minStartValueUsd: number
	maxStartValueUsd: number
	runCount: number
}
