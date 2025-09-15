import { Injectable } from '@nestjs/common'

import { ParsedTransactionWithMeta } from '@solana/web3.js'
import {
	InchainConfirmation,
	InchainExecution,
	InchainExecutor,
} from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { PriceOracleHelper } from '../../price-oracle/price-oracle-helper'
import { RaydiumService } from '../../raydium/raydium.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTxCostHelper } from '../shared-helpers/chain-specific/solana/solana-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { RAYDIUM_PROTOCOL } from './constants'

@Injectable()
export class RaydiumExecutorPlugin
	extends EdgeHandler
	implements ExecutorPlugin
{
	constructor(
		private readonly raydiumService: RaydiumService,
		readonly SolanaTxCostHelper: SolanaTxCostHelper,
		readonly priceOracleHelper: PriceOracleHelper,
	) {
		super(RAYDIUM_PROTOCOL)
	}

	buildEdgeExecutor(edge: Edge<SolanaToken>): InchainExecutor {
		return {
			kind: 'inchain',
			edge,
			execute: this.execute.bind(this, edge),
		}
	}

	async execute(
		edge: Edge<SolanaToken>,
		amountIn: bigint,
	): Promise<InchainExecution> {
		const result = await this.raydiumService.swap({
			tokenIn: edge.from,
			tokenOut: edge.to,
			amountIn,
		})

		return {
			txId: result.txId,
			confirm: this.confirm.bind(this, result),
		}
	}

	async confirm(
		swapResult: Awaited<ReturnType<typeof this.raydiumService.swap>>,
	): Promise<InchainConfirmation> {
		const result = await swapResult.waitForResult()

		if (result.status === 'failed') {
			return {
				status: 'failed',
				reason: 'Swap failed',
				getExecutionCost: this.getExecutionCost.bind(
					this,
					result.parsedTx,
				),
			}
		}
		return {
			status: 'success',
			amountOut: result.amountOut,
			getExecutionCost: this.getExecutionCost.bind(this, result.parsedTx),
		}
	}

	async getExecutionCost(parsedTx: ParsedTransactionWithMeta) {
		const costInUsd = await this.SolanaTxCostHelper.getTxCostInUsd(parsedTx)

		return { costInUsd }
	}
}
