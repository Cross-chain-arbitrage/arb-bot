import { Injectable } from '@nestjs/common'
import {
	EdgeExecutor,
	InchainConfirmation,
	InchainExecution,
} from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Pool } from '../../dex/base/pool'
import { Token } from '../../evm/primitives/tokens/Token'
import { EvmPluginHelper } from '../helpers/evm-plugin-helper'
import { DexPlugin } from './dex-plugin'
import { EdgeToPoolRegistry } from './edge-to-pool-registry'

@Injectable()
export class DexExecutorPlugin extends DexPlugin implements ExecutorPlugin {
	constructor(
		private readonly evmPluginHelper: EvmPluginHelper,
		private readonly edgeToPoolRegistry: EdgeToPoolRegistry,
	) {
		super()
	}

	buildEdgeExecutor(edge: Edge<Token>): EdgeExecutor {
		return {
			kind: 'inchain',
			edge,
			execute: this.execute.bind(this, edge),
		}
	}

	async execute(
		edge: Edge<Token>,
		amountIn: bigint,
	): Promise<InchainExecution> {
		const pool = this.edgeToPoolRegistry.getPool(edge)

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
	): Promise<InchainConfirmation> {
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
