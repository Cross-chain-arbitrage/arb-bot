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
import { TokenBase } from '../../evm/primitives/tokens/TokenBase'
import { LifiService } from '../../lifi/lifi.service'
import { InterpolationHelper } from '../shared/helpers/interpolation/interpolation-helper'
import { EdgeHandler } from '../shared/implementations/edge-handler'
import { pathToSnapshotConfig } from '../shared/utils/path-to-config'
import { LIFI_CONFIG_KEY, LIFI_PROTOCOL } from './constants'
import { LifiSnapshotConfig } from './types'

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

		const snapshotConfig = this.configService.getOrThrow<LifiSnapshotConfig>(
			pathToSnapshotConfig(LIFI_CONFIG_KEY),
		)

		const { interpolation, results } =
			await this.interpolationHelper.buildInterpolation(
				edge,
				snapshotConfig.interpolationParams,
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
				negativeLogRate: calcRate(amountIn, amountOut),
				amountOut,
				expectedCostInUsd: executionCostInUsd,
			}
		}
	}
}
