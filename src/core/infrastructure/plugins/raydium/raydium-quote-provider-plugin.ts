import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { scaleLinear } from 'd3-scale'

import {
	EdgeQuoteProvider,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-quote-provider'
import { QuoteProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { RaydiumService } from '../../raydium/raydium.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { PriceOracleHelper } from '../helpers/price-oracle-helper'
import { SolanaPluginHelper } from '../helpers/solana-plugin-helper'
import { RaydiumGraphPlugin } from './raydium-graph-plugin'
import { InterpolationParams } from './types'

@Injectable()
export class RaydiumQuoteProviderPlugin
	extends RaydiumGraphPlugin
	implements QuoteProviderPlugin
{
	constructor(
		private readonly configService: ConfigService,
		private readonly raydiumService: RaydiumService,
		readonly solanaPluginHelper: SolanaPluginHelper,
		readonly priceOracleHelper: PriceOracleHelper,
	) {
		super()
	}

	buildEdgeQuoteProvider(edge: Edge<SolanaToken>): EdgeQuoteProvider {
		return {
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge)
			},
		}
	}

	async buildSnapshotFn(edge: Edge<SolanaToken>): Promise<EdgeSnapshotFn> {
		const { from, to } = edge

		const interpolationParams = this.configService.get<InterpolationParams>(
			'RAYDIUM_INTERPOLATION_PARAMS',
		)

		const { minStartValueUsd, maxStartValueUsd, runCount } =
			interpolationParams!

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

			promises.push(
				this.raydiumService.quote({
					tokenIn: from,
					tokenOut: to,
					amountIn,
				}),
			)
		}

		const results = await Promise.all(promises)

		const executionCostInUsd =
			await this.solanaPluginHelper.getExpectedTxCostInUsd(
				results[0].amountOut,
			)

		for (const result of results) {
			const amountOutFormatted = Number(to.formatUnits(result.amountOut))
			amountsOutFormatter.push(amountOutFormatted)
		}

		const interpolation = scaleLinear()
			.domain(amountsInFormatter)
			.range(amountsOutFormatter)

		return (amountIn: bigint): Quote => {
			const amountOutFormatted = interpolation(Number(amountIn))
			const amountOut = to.parseUnits(amountOutFormatted.toString())

			return {
				rate: this.solanaPluginHelper.calcRate(amountIn, amountOut),
				amountOut,
				executionCostInUsd: executionCostInUsd,
			}
		}
	}
}
