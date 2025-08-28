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
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { SolanaTxCostUtils } from '../shared-utils/chain-specific/solana/solana-tx-cost.utils'
import { PriceOracleHelper } from '../shared-utils/price-oracle-helper'
import { RAYDIUM_PROTOCOL } from './raydium-plugin-constants'

@Injectable()
export class RaydiumExecutorPlugin
	extends EdgeHandler
	implements ExecutorPlugin
{
	constructor(
		private readonly raydiumService: RaydiumService,
		readonly solanaTxCostUtils: SolanaTxCostUtils,
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
		const { amountOut, parsedTx } = await swapResult.waitForResult()

		return {
			amountOut,
			getExecutionCost: async () => {
				const costInUsd =
					await this.solanaTxCostUtils.getTxCostInUsd(parsedTx)

				return {
					costInUsd,
				}
			},
		}
	}
}
