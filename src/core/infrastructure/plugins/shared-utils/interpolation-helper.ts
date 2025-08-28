import { Injectable } from '@nestjs/common'
import { ScaleLinear, scaleLinear } from 'd3-scale'
import { Edge } from '../../../domain/entities/edge'
import { Token } from '../../../domain/entities/token'
import { PriceOracleHelper } from './price-oracle-helper'

export type InterpolationParams = {
	minStartValueUsd: number
	maxStartValueUsd: number
	runCount: number
}

@Injectable()
export class InterpolationHelper {
	constructor(private readonly priceOracleHelper: PriceOracleHelper) {}

	async buildInterpolation<T extends { amountOut: bigint }>(
		edge: Edge<Token>,
		interpolationParams: InterpolationParams,
		getAmountOut: (amountIn: bigint) => Promise<T>,
	): Promise<{
		interpolation: ScaleLinear<number, number, never>
		results: T[]
	}> {
		const { minStartValueUsd, maxStartValueUsd, runCount } =
			interpolationParams

		const { from, to } = edge

		const amountsInFormatter: number[] = []
		const amountsOutFormatter: number[] = []
		const promises = []

		for (let i = 0; i < runCount; i++) {
			const usdAmountIn =
				minStartValueUsd +
				((maxStartValueUsd - minStartValueUsd) * i) / runCount

			const amountIn =
				await this.priceOracleHelper.estimateTokenAmountFromUsd(
					from,
					usdAmountIn,
				)

			amountsInFormatter.push(Number(from.formatUnits(amountIn)))

			promises.push(getAmountOut(amountIn))
		}

		const results = await Promise.all(promises)

		for (const result of results) {
			const amountOutFormatted = Number(to.formatUnits(result.amountOut))
			amountsOutFormatter.push(amountOutFormatted)
		}

		const interpolation = scaleLinear()
			.domain(amountsInFormatter)
			.range(amountsOutFormatter)

		return {
			interpolation,
			results,
		}
	}
}
