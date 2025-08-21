import { Injectable } from '@nestjs/common'

import {
	InchainConfirmation,
	InchainExecution,
	InchainExecutor,
} from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { RaydiumService } from '../../raydium/raydium.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { PriceOracleHelper } from '../helpers/price-oracle-helper'
import { SolanaPluginHelper } from '../helpers/solana-plugin-helper'
import { RaydiumPlugin } from './raydium-plugin'

@Injectable()
export class RaydiumExecutorPlugin
	extends RaydiumPlugin
	implements ExecutorPlugin
{
	constructor(
		private readonly raydiumService: RaydiumService,
		readonly solanaPluginHelper: SolanaPluginHelper,
		readonly priceOracleHelper: PriceOracleHelper,
	) {
		super()
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
		const { amountOut, parsedTx } = await swapResult.waitForResult()

		return {
			amountOut,
			getExecutionCost: async () => {
				const costInUsd =
					await this.solanaPluginHelper.getTxCostInUsd(parsedTx)

				return {
					costInUsd,
				}
			},
		}
	}
}
