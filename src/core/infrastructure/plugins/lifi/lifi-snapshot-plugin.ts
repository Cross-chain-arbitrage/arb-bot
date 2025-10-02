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
import { TokenBase } from '../../evm/primitives/tokens/TokenBase'
import { LifiService } from '../../lifi/lifi.service'
import { InterpolationHelper } from '../shared-helpers/interpolation/interpolation-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { LIFI_CONFIG_KEY } from './configuration/lifi-config'
import { LIFI_PROTOCOL } from './constants'
import { LifiConfig } from './types'

@Injectable()
export class LifiSnapshotPlugin extends EdgeHandler implements SnapshotPlugin {
	constructor(
		private readonly lifiService: LifiService,
		private readonly interpolationHelper: InterpolationHelper,
		private readonly configService: ConfigService,
	) {
		super(LIFI_PROTOCOL)
	}

	buildEdgeSnapshotBuilder(edge: Edge<TokenBase>): EdgeSnapshotBuilder {
		return {
			edge,
			buildEdgeSnapshotFn: async () => {
				return this.buildSnapshotFn(edge)
			},
		}
	}

	async buildSnapshotFn(edge: Edge<TokenBase>): Promise<EdgeSnapshotFn> {
		const { from, to } = edge

		const interpolationParams =
			this.configService.get<LifiConfig>(LIFI_CONFIG_KEY)

		const { interpolation, results } =
			await this.interpolationHelper.buildInterpolation(
				edge,
				interpolationParams!.interpolationParams,
				(amountIn) => {
					return this.lifiService.quote(from, to, amountIn)
				},
			)

		const executionCostInUsd = results[0].txCostInUsd

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
