import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
	EdgeQuoteProvider,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-quote-provider'
import { QuoteProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { Token } from '../../evm/primitives/tokens/Token'
import { EvmPluginHelper } from '../helpers/evm-plugin-helper'
import { InterpolationHelper } from '../helpers/interpolation-helper'
import { DexGraphPlugin } from './dex-graph-plugin'
import { DexConfig } from './types'

@Injectable()
export class DexQuoteProviderPlugin
	extends DexGraphPlugin
	implements QuoteProviderPlugin
{
	constructor(
		private readonly configService: ConfigService,
		private readonly interpolationHelper: InterpolationHelper,
		private readonly evmPluginHelper: EvmPluginHelper,
	) {
		super()
	}

	buildEdgeQuoteProvider(edge: Edge<Token>): EdgeQuoteProvider {
		return {
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge)
			},
		}
	}

	async buildSnapshotFn(edge: Edge<Token>): Promise<EdgeSnapshotFn> {
		const pool = this.edgeIdToPool[edge.id]

		if (!pool) {
			throw new Error('Pool not found with edge id: ' + edge.id)
		}

		const config = this.configService.get<DexConfig>('dex')

		const { interpolation, results } =
			await this.interpolationHelper.buildInterpolation(
				edge,
				config!.interpolationParams,
				(amountIn) => {
					return pool.quoteSwap({
						tokenIn: edge.from,
						tokenOut: edge.to,
						amountIn,
					})
				},
			)

		const executionCostInUsd =
			await this.evmPluginHelper.getExpectedTxCostInUsd(
				edge.from.chainId,
				results[0].gas,
			)

		return (amountIn: bigint): Quote => {
			const amountOutFormatted = interpolation(Number(amountIn))
			const amountOut = edge.to.parseUnits(amountOutFormatted.toString())

			return {
				rate: this.evmPluginHelper.calcRate(amountIn, amountOut),
				amountOut,
				executionCostInUsd: executionCostInUsd,
			}
		}
	}
}
