import { Injectable } from '@nestjs/common'
import {
	EdgeActionProvider,
	InchainConfirmingResult,
	InchainExecutingResult,
} from '../../../application/interfaces/edge-action-provider'
import { ActionProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Pool } from '../../dex/base/pool'
import { Token } from '../../evm/primitives/tokens/Token'
import { EvmPluginHelper } from '../helpers/evm-plugin-helper'
import { DexGraphPlugin } from './dex-graph-plugin'

@Injectable()
export class DexActionProviderPlugin
	extends DexGraphPlugin
	implements ActionProviderPlugin
{
	constructor(private readonly evmPluginHelper: EvmPluginHelper) {
		super()
	}

	buildEdgeActionProvider(edge: Edge<Token>): EdgeActionProvider {
		return {
			kind: 'inchain',
			edge,
			execute: this.execute.bind(this, edge),
		}
	}

	async execute(
		edge: Edge<Token>,
		amountIn: bigint,
	): Promise<InchainExecutingResult> {
		const pool = this.edgeIdToPool[edge.id]

		if (!pool) {
			throw new Error('Pool not found with edge id: ' + edge.id)
		}

		const swapResult = await pool.swap({
			tokenIn: edge.from,
			tokenOut: edge.to,
			amountIn,
		})

		return {
			txId: swapResult.txHash,
			confirm: this.confirm.bind(this, edge, swapResult),
		}
	}

	async confirm(
		edge: Edge<Token>,
		swapResult: Awaited<ReturnType<Pool['swap']>>,
	): Promise<InchainConfirmingResult> {
		const { amountOut, receipt } = await swapResult.waitForResult()

		return {
			amountOut,
			getExecutionCost: async () => {
				const txCostInUsd = await this.evmPluginHelper.getTxCostInUsd(
					edge.from.chainId,
					receipt,
				)

				return {
					costInUsd: txCostInUsd,
				}
			},
		}
	}
}
