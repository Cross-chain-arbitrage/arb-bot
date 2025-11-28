import { Injectable } from '@nestjs/common'

import { ParsedTransactionWithMeta } from '@solana/web3.js'
import {
	InchainConfirmation,
	InchainExecution,
	InchainExecutor,
} from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { TokenValuator } from '../../../application/use-cases/token-valuator/token-valuator'
import { Edge } from '../../../domain/entities/edge'
import { JupiterService } from '../../jupiter/jupiter.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTxCostHelper } from '../shared/helpers/chain-specific/solana/solana-tx-cost-helper'
import { EdgeHandler } from '../shared/implementations/edge-handler'
import { JUPITER_PROTOCOL } from './constants'

@Injectable()
export class JupiterExecutorPlugin
	extends EdgeHandler
	implements ExecutorPlugin
{
	constructor(
		private readonly jupiterService: JupiterService,
		readonly solanaTxCostHelper: SolanaTxCostHelper,
		readonly tokenValuator: TokenValuator,
	) {
		super(JUPITER_PROTOCOL)
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
		const result = await this.jupiterService.swap(
			edge.from,
			edge.to,
			amountIn,
		)

		return {
			txId: result.txId,
			confirm: this.confirm.bind(this, result),
		}
	}

	async confirm(
		swapResult: Awaited<ReturnType<typeof this.jupiterService.swap>>,
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
		const costInUsd = await this.solanaTxCostHelper.getTxCostInUsd(parsedTx)

		return { costInUsd }
	}
}
