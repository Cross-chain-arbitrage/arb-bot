import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
	EdgeExecutor,
	InchainConfirmation,
	InchainExecution,
} from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Pool } from '../../dex/base/pool'
import { PoolUtils } from '../../dex/pool-utils'
import { Token } from '../../evm/primitives/tokens/Token'
import { EvmTxCostUtils } from '../shared-utils/chain-specific/evm/evm-tx-cost.utils'
import { DexPlugin } from './dex-plugin'

@Injectable()
export class DexExecutorPlugin extends DexPlugin implements ExecutorPlugin {
	constructor(
		poolUtils: PoolUtils,
		configService: ConfigService,
		private readonly evmTxCostUtils: EvmTxCostUtils,
	) {
		super(poolUtils, configService)
	}

	async buildEdgeExecutor(edge: Edge<Token>): Promise<EdgeExecutor> {
		const pool = await this.getPool(edge)

		return {
			kind: 'inchain',
			edge,
			execute: this.execute.bind(this, edge, pool),
		}
	}

	async execute(
		edge: Edge<Token>,
		pool: Pool,
		amountIn: bigint,
	): Promise<InchainExecution> {
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
				const txCostInUsd = await this.evmTxCostUtils.getTxCostInUsd(
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
