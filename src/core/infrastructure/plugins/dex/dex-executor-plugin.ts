import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TransactionReceipt } from 'viem'
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
			prepareExecution: this.prepareExecution.bind(this, edge),
		}
	}

	async prepareExecution(edge: Edge<Token>): Promise<{ result: string }> {
		const pool = await this.getPool(edge)

		const approveResult = await pool.approveInfinite()

		const txHashes = approveResult
			.filter((tx) => tx !== undefined)
			.map((tx) => tx.transactionHash)

		if (txHashes.length === 0) return { result: 'No approvals needed' }

		return {
			result: `Prepared approvals: ${txHashes.join(', ')}`,
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
		const result = await swapResult.waitForResult()

		if (result.status === 'reverted') {
			return {
				status: 'failure',
				reason: 'Swap reverted',
				getExecutionCost: this.getExecutionCost.bind(
					this,
					edge,
					result.receipt,
				),
			}
		}
		return {
			status: 'success',
			amountOut: result.amountOut,
			getExecutionCost: this.getExecutionCost.bind(
				this,
				edge,
				result.receipt,
			),
		}
	}

	async getExecutionCost(edge: Edge<Token>, receipt: TransactionReceipt) {
		const txCostInUsd = await this.evmTxCostUtils.getTxCostInUsd(
			edge.from.chainId,
			receipt,
		)

		return {
			costInUsd: txCostInUsd,
		}
	}
}
