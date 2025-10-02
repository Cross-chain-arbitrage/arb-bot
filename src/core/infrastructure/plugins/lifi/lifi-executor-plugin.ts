import { Injectable } from '@nestjs/common'
import { TransactionReceipt } from 'viem'
import {
	EdgeExecutor,
	ExecutionCost,
	InchainConfirmation,
	InchainExecution,
} from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { TokenBase } from '../../evm/primitives/tokens/TokenBase'
import { LifiService } from '../../lifi/lifi.service'
import { SwapResult } from '../../lifi/types'
import { EvmTxCostHelper } from '../shared-helpers/chain-specific/evm/evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { LIFI_PROTOCOL } from './constants'

@Injectable()
export class LifiExecutorPlugin extends EdgeHandler implements ExecutorPlugin {
	constructor(
		private readonly lifiService: LifiService,
		private readonly evmTxCostHelper: EvmTxCostHelper,
	) {
		super(LIFI_PROTOCOL)
	}

	buildEdgeExecutor(edge: Edge<TokenBase>): EdgeExecutor {
		return {
			edge: edge,
			kind: 'inchain',
			execute: (amountIn: bigint) => this.execute(edge, amountIn),
		}
	}

	async execute(
		edge: Edge<TokenBase>,
		amountIn: bigint,
	): Promise<InchainExecution> {
		const res = await this.lifiService.swap(edge.from, edge.to, amountIn)

		return {
			txId: res.txHash,
			confirm: () => this.confirm(edge, res.waitForResult),
		}
	}

	async confirm(
		edge: Edge<TokenBase>,
		waitForResFn: () => Promise<SwapResult>,
	): Promise<InchainConfirmation> {
		const swapRes = await waitForResFn()

		if (swapRes.status === 'reverted')
			return {
				status: 'failed',
				reason: 'Transaction reverted',
				getExecutionCost: () =>
					this.getExecutionCost(edge, swapRes.receipt),
			}

		return {
			status: 'success',
			amountOut: swapRes.amountOut,
			getExecutionCost: () =>
				this.getExecutionCost(edge, swapRes.receipt),
		}
	}

	async getExecutionCost(
		edge: Edge<TokenBase>,
		txReceipt: TransactionReceipt,
	): Promise<ExecutionCost> {
		const txCost = await this.evmTxCostHelper.getTxCostInUsd(
			edge.from.chainId,
			txReceipt,
		)

		return {
			costInUsd: txCost,
		}
	}
}
