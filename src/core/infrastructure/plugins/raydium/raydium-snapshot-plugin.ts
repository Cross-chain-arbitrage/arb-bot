import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import {
	EdgeSnapshotBuilder,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { PriceOracleHelper } from '../../price-oracle/price-oracle-helper'
import { RaydiumService } from '../../raydium/raydium.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTxCostHelper } from '../shared-helpers/chain-specific/solana/solana-tx-cost-helper'
import { InterpolationHelper } from '../shared-helpers/interpolation/interpolation-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { RAYDIUM_CONFIG_KEY } from './configuration/raydium-config'
import { RAYDIUM_PROTOCOL } from './constants'
import { RaydiumConfig } from './types'

@Injectable()
export class RaydiumSnapshotPlugin
	extends EdgeHandler
	implements SnapshotPlugin
{
	constructor(
		private readonly configService: ConfigService,
		private readonly raydiumService: RaydiumService,
		readonly SolanaTxCostHelper: SolanaTxCostHelper,
		readonly priceOracleHelper: PriceOracleHelper,
		readonly interpolationHelper: InterpolationHelper,
	) {
		super(RAYDIUM_PROTOCOL)
	}

	buildEdgeSnapshotBuilder(edge: Edge<SolanaToken>): EdgeSnapshotBuilder {
		return {
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge)
			},
		}
	}

	async buildSnapshotFn(edge: Edge<SolanaToken>): Promise<EdgeSnapshotFn> {
		const { from, to } = edge

		const interpolationParams =
			this.configService.get<RaydiumConfig>(RAYDIUM_CONFIG_KEY)

		const { interpolation, results } =
			await this.interpolationHelper.buildInterpolation(
				edge,
				interpolationParams!.interpolationParams,
				(amountIn) => {
					return this.raydiumService.quote({
						tokenIn: from,
						tokenOut: to,
						amountIn,
					})
				},
			)

		const executionCostInUsd =
			await this.SolanaTxCostHelper.getExpectedTxCostInUsd(
				results[0].amountOut,
			)

		return (amountIn: bigint): Quote => {
			const amountInFormatted = edge.from.formatUnits(amountIn)

			const amountOutFormatted = interpolation(Number(amountInFormatted))
			const amountOut = to.parseUnits(amountOutFormatted.toString())

			return {
				rate: calcRate(amountIn, amountOut),
				amountOut,
				executionCostInUsd: executionCostInUsd,
			}
		}
	}
}
