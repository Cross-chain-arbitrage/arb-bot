import { Injectable } from '@nestjs/common'
import { EdgeQuoter } from '../../../application/interfaces/edge-quoter'
import { QuoterPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/quote'
import { RaydiumService } from '../../raydium/raydium.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTxCostHelper } from '../shared/helpers/chain-specific/solana/solana-tx-cost-helper'
import { EdgeHandler } from '../shared/implementations/edge-handler'
import { RAYDIUM_PROTOCOL } from './constants'

@Injectable()
export class RaydiumQuoterPlugin extends EdgeHandler implements QuoterPlugin {
	constructor(
		private readonly raydiumService: RaydiumService,
		private readonly solanaTxCostHelper: SolanaTxCostHelper,
	) {
		super(RAYDIUM_PROTOCOL)
	}

	buildEdgeQuoter(edge: Edge<SolanaToken>): EdgeQuoter | Promise<EdgeQuoter> {
		return {
			edge,
			quote: this.quote.bind(this, edge),
		}
	}

	async quote(edge: Edge<SolanaToken>, amountIn: bigint): Promise<Quote> {
		const quoteResult = await this.raydiumService.quote({
			tokenIn: edge.from,
			tokenOut: edge.to,
			amountIn,
		})

		const executionCostInUsd =
			await this.solanaTxCostHelper.getExpectedTxCostInUsd(
				BigInt(quoteResult.unitConsumption),
			)

		return {
			negativeLogRate: calcRate(amountIn, quoteResult.amountOut),
			amountOut: quoteResult.amountOut,
			expectedCostInUsd: executionCostInUsd,
		}
	}
}
