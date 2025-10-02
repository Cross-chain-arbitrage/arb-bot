import { Injectable } from '@nestjs/common'
import { EdgeQuoter } from '../../../application/interfaces/edge-quoter'
import { QuoterPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { TokenIdUtils } from '../../../domain/services/token-id-utils'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { RelayService } from '../../relay/relay-service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaEvmTxCostHelper } from '../shared-helpers/chain-specific/solana-evm/solana-evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { RELAY_PROTOCOL } from './constants'

@Injectable()
export class RelayQuoterPlugin extends EdgeHandler implements QuoterPlugin {
	constructor(
		private readonly relayService: RelayService,
		private readonly solanaEvmTxCostHelper: SolanaEvmTxCostHelper,
	) {
		super(RELAY_PROTOCOL)
	}

	buildEdgeQuoter(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
	): EdgeQuoter | Promise<EdgeQuoter> {
		return {
			edge,
			quote: (amountIn: bigint) => this.quote(edge, amountIn),
		}
	}

	async quote(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
		amountIn: bigint,
	): Promise<Quote> {
		const quote = await this.relayService.quote(
			edge.from,
			edge.to,
			amountIn,
		)

		const costInUsd =
			await this.solanaEvmTxCostHelper.getUsdCostOfNativeAmount(
				TokenIdUtils.parseId(edge.from.id).chainId,
				quote.gasInNative,
			)

		return {
			rate: calcRate(amountIn, quote.amountOut),
			amountOut: quote.amountOut,
			executionCostInUsd: costInUsd,
		}
	}
}
