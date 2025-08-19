import { Injectable } from '@nestjs/common'

import {
	InchainActionProvider,
	InchainConfirmingResult,
	InchainExecutingResult,
} from '../../../application/interfaces/edge-action-provider'
import { ActionProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { RaydiumService } from '../../raydium/raydium.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { PriceOracleHelper } from '../helpers/price-oracle-helper'
import { SolanaPluginHelper } from '../helpers/solana-plugin-helper'
import { RaydiumGraphPlugin } from './raydium-graph-plugin'

@Injectable()
export class RaydiumActionProviderPlugin
	extends RaydiumGraphPlugin
	implements ActionProviderPlugin
{
	constructor(
		private readonly raydiumService: RaydiumService,
		readonly solanaPluginHelper: SolanaPluginHelper,
		readonly priceOracleHelper: PriceOracleHelper,
	) {
		super()
	}

	buildEdgeActionProvider(edge: Edge<SolanaToken>): InchainActionProvider {
		return {
			kind: 'inchain',
			edge,
			execute: this.execute.bind(this, edge),
		}
	}

	async execute(
		edge: Edge<SolanaToken>,
		amountIn: bigint,
	): Promise<InchainExecutingResult> {
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
	): Promise<InchainConfirmingResult> {
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
