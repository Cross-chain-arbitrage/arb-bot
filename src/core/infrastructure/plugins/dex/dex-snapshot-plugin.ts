import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
	EdgeSnapshotBuilder,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/quote'
import { Pool } from '../../dex/base/pool'
import { PoolUtils } from '../../dex/pool-utils'
import { Token } from '../../evm/primitives/tokens/Token'
import { EvmTxCostHelper } from '../shared-helpers/chain-specific/evm/evm-tx-cost-helper'
import { InterpolationHelper } from '../shared-helpers/interpolation/interpolation-helper'
import { DEX_CONFIG_KEY } from './configuration/dex-config'
import { DexPlugin } from './dex-plugin'
import { DexConfig } from './types'

@Injectable()
export class DexSnapshotPlugin extends DexPlugin implements SnapshotPlugin {
	constructor(
		configService: ConfigService,
		private readonly interpolationHelper: InterpolationHelper,
		poolUtils: PoolUtils,
		private readonly EvmTxCostHelper: EvmTxCostHelper,
	) {
		super(poolUtils, configService)
	}

	async buildEdgeSnapshotBuilder(
		edge: Edge<Token>,
	): Promise<EdgeSnapshotBuilder> {
		const pool = await this.getPool(edge)

		return {
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge, pool)
			},
		}
	}

	async buildSnapshotFn(
		edge: Edge<Token>,
		pool: Pool,
	): Promise<EdgeSnapshotFn> {
		const config = this.configService.get<DexConfig>(DEX_CONFIG_KEY)

		if (!config) {
			throw new Error('DEX config not found')
		}

		const { interpolation, results } =
			await this.interpolationHelper.buildInterpolation(
				edge,
				config.interpolationParams,
				(amountIn) => {
					return pool.quoteSwap({
						tokenIn: edge.from,
						tokenOut: edge.to,
						amountIn,
					})
				},
			)

		const executionCostInUsd =
			await this.EvmTxCostHelper.getExpectedTxCostInUsd(
				edge.from.chainId,
				results[0].gas,
			)

		return (amountIn: bigint): Quote => {
			const amountInFormatted = edge.from.formatUnits(amountIn)

			const amountOutFormatted = interpolation(Number(amountInFormatted))
			const amountOut = edge.to.parseUnits(amountOutFormatted.toString())

			return {
				negativeLogRate: calcRate(amountIn, amountOut),
				amountOut,
				expectedCostInUsd: executionCostInUsd,
			}
		}
	}
}
