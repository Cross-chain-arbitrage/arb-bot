import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
	EdgeSnapshotBuilder,
	EdgeSnapshotFn,
} from '../../../application/interfaces/edge-snapshot-builder'
import { SnapshotPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { Token } from '../../evm/primitives/tokens/Token'
import { EvmPluginHelper } from '../helpers/evm-plugin-helper'
import { InterpolationHelper } from '../helpers/interpolation-helper'
import { DEX_CONFIG_KEY } from './configuration/dex-config'
import { DexPlugin } from './dex-plugin'
import { EdgeToPoolRegistry } from './edge-to-pool-registry'
import { DexConfig } from './types'

@Injectable()
export class DexSnapshotPlugin extends DexPlugin implements SnapshotPlugin {
	constructor(
		private readonly configService: ConfigService,
		private readonly interpolationHelper: InterpolationHelper,
		private readonly evmPluginHelper: EvmPluginHelper,
		private readonly edgeToPoolRegistry: EdgeToPoolRegistry,
	) {
		super()
		console.log('DexSnapshotPlugin', edgeToPoolRegistry)
	}

	buildEdgeSnapshotBuilder(edge: Edge<Token>): EdgeSnapshotBuilder {
		return {
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge)
			},
		}
	}

	async buildSnapshotFn(edge: Edge<Token>): Promise<EdgeSnapshotFn> {
		const pool = this.edgeToPoolRegistry.getPool(edge)

		const config = this.configService.get<DexConfig>(DEX_CONFIG_KEY)

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
			const amountInFormatted = edge.from.formatUnits(amountIn)

			const amountOutFormatted = interpolation(Number(amountInFormatted))
			const amountOut = edge.to.parseUnits(amountOutFormatted.toString())

			return {
				rate: this.evmPluginHelper.calcRate(amountIn, amountOut),
				amountOut,
				executionCostInUsd: executionCostInUsd,
			}
		}
	}
}
