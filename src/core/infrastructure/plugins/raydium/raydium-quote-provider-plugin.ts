import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { scaleLinear } from 'd3-scale'
import {
	EdgeQuoteProvider,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-quote-provider'
import { QuoteProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { Edge } from '../../../domain/entities/edge'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import { getExpectedTxCostInUsd } from '../helpers/solana-context-helpers'
import { RaydiumGraphPlugin } from './raydium-graph-plugin'
import { RaydiumService } from './service/raydium.service'
import { InterpolationParams } from './types'

@Injectable()
export class RaydiumQuoteProviderPlugin
	extends RaydiumGraphPlugin
	implements QuoteProviderPlugin
{
	constructor(
		private readonly configService: ConfigService,
		private readonly raydiumService: RaydiumService,
		readonly priceOracle: PriceOracle,
		readonly solanaTokenUtils: SolanaTokenUtils,
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

		const fromTokenPrice = await this.priceOracle.getPrice(from)

		const amountsInFormatter: number[] = []
		const amountsOutFormatter: number[] = []
		const promises = []

		for (let i = 0; i < runCount; i++) {
			const usdAmountIn =
				minStartValueUsd +
				((maxStartValueUsd - minStartValueUsd) * i) / runCount

			const amountInFormatted = usdAmountIn / fromTokenPrice

			const amountIn = from.parseUnits(amountInFormatted.toString())

			amountsInFormatter.push(amountInFormatted)

			promises.push(
				this.raydiumService.quote({
					tokenIn: from,
					tokenOut: to,
					amountIn,
				}),
			)
		}

		const results = await Promise.all(promises)

		const executionCostInUsd = await getExpectedTxCostInUsd.bind(this)(
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
				rate: this.calcRate(amountIn, amountOut),
				amountOut,
				executionCostInUsd: executionCostInUsd,
			}
		}
	}

	calcRate(amountIn: bigint, amountOut: bigint) {
		return -Math.log(Number(amountOut) / Number(amountIn))
	}
}
