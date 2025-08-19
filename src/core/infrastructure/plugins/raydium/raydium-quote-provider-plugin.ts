import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import {
	EdgeQuoteProvider,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-quote-provider'
import { QuoteProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { RaydiumService } from '../../raydium/raydium.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import {
	InterpolationHelper,
	InterpolationParams,
} from '../helpers/interpolation-helper'
import { PriceOracleHelper } from '../helpers/price-oracle-helper'
import { SolanaPluginHelper } from '../helpers/solana-plugin-helper'
import { RaydiumGraphPlugin } from './raydium-graph-plugin'

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
		readonly interpolationHelper: InterpolationHelper,
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

		const { interpolation, results } =
			await this.interpolationHelper.buildInterpolation(
				edge,
				interpolationParams!,
				(amountIn) => {
					return this.raydiumService.quote({
						tokenIn: from,
						tokenOut: to,
						amountIn,
					})
				},
			)

		const executionCostInUsd =
			await this.solanaPluginHelper.getExpectedTxCostInUsd(
				results[0].amountOut,
			)

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
