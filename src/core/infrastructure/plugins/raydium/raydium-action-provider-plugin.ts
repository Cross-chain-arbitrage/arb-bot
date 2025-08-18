import { Injectable } from '@nestjs/common'
import {
	InchainActionProvider,
	InchainConfirmingResult,
	InchainExecutingResult,
} from '../../../application/interfaces/edge-action-provider'
import { ActionProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { Edge } from '../../../domain/entities/edge'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import { getTxCostInUsd } from '../helpers/solana-context-helpers'
import { RaydiumGraphPlugin } from './raydium-graph-plugin'
import { RaydiumService } from './service/raydium.service'

@Injectable()
export class RaydiumActionProviderPlugin
	extends RaydiumGraphPlugin
	implements ActionProviderPlugin
{
	constructor(
		private readonly raydiumService: RaydiumService,
		readonly solanaTokenUtils: SolanaTokenUtils,
		readonly priceOracle: PriceOracle,
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
				const costInUsd = await getTxCostInUsd.bind(this)(parsedTx)

				return {
					costInUsd,
				}
			},
		}
	}
}
