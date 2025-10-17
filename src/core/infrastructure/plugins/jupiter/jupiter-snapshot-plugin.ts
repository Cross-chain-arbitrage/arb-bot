import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import {
	EdgeSnapshotBuilder,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { TokenValuator } from '../../../application/use-cases/token-valuator/token-valuator'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/quote'
import { JupiterService } from '../../jupiter/jupiter.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTxCostHelper } from '../shared-helpers/chain-specific/solana/solana-tx-cost-helper'
import { InterpolationHelper } from '../shared-helpers/interpolation/interpolation-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { JUPITER_CONFIG_KEY } from './configuration/jupiter-config'
import { JUPITER_PROTOCOL } from './constants'
import { JupiterConfig } from './types'

@Injectable()
export class JupiterSnapshotPlugin
	extends EdgeHandler
	implements SnapshotPlugin
{
	constructor(
		private readonly configService: ConfigService,
		private readonly jupiterService: JupiterService,
		readonly solanaTxCostHelper: SolanaTxCostHelper,
		readonly tokenValuator: TokenValuator,
		readonly interpolationHelper: InterpolationHelper,
	) {
		super(JUPITER_PROTOCOL)
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
			this.configService.get<JupiterConfig>(JUPITER_CONFIG_KEY)

		const { interpolation, results } =
			await this.interpolationHelper.buildInterpolation(
				edge,
				interpolationParams!.interpolationParams,
				(amountIn) => {
					return this.jupiterService.quote(from, to, amountIn)
				},
			)

		const executionCostInUsd =
			await this.solanaTxCostHelper.getExpectedTxCostInUsd(
				BigInt(results[0].unitConsumption),
			)

		return (amountIn: bigint): Quote => {
			const amountInFormatted = edge.from.formatUnits(amountIn)

			const amountOutFormatted = interpolation(Number(amountInFormatted))
			const amountOut = to.parseUnits(amountOutFormatted.toString())

			return {
				negativeLogRate: calcRate(amountIn, amountOut),
				amountOut,
				expectedCostInUsd: executionCostInUsd,
			}
		}
	}
}
