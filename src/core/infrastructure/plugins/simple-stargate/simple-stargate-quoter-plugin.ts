import { Injectable } from '@nestjs/common'
import { EdgeQuoter } from '../../../application/interfaces/edge-quoter'
import { QuoterPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { TokenIdUtils } from '../../../domain/services/token-id-utils'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { SimpleStargateService } from '../../layerzero-bridges/stargate/simple-stargate.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaEvmTxCostHelper } from '../shared-helpers/chain-specific/solana-evm/solana-evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { SIMPLE_STARGATE_PROTOCOL } from './constants'

@Injectable()
export class SimpleStargateQuoterPlugin
	extends EdgeHandler
	implements QuoterPlugin
{
	constructor(
		readonly simpleStargateService: SimpleStargateService,
		readonly solanaEvmTxCostHelper: SolanaEvmTxCostHelper,
	) {
		super(SIMPLE_STARGATE_PROTOCOL)
	}

	buildEdgeQuoter(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
	): EdgeQuoter | Promise<EdgeQuoter> {
		return {
			edge,
			quote: this.quote.bind(this, edge),
		}
	}

	async quote(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
		amountIn: bigint,
	): Promise<Quote> {
		const { amountOut, gas, feeInNative } =
			await this.simpleStargateService.quote(edge.from, edge.to, amountIn)

		const chainId = TokenIdUtils.parseId(edge.from.id).chainId

		const txCostInUsd =
			await this.solanaEvmTxCostHelper.getExpectedTxCostInUsd(
				chainId,
				gas,
			)

		const bridgeFeeInUsd =
			await this.solanaEvmTxCostHelper.getUsdCostOfNativeAmount(
				chainId,
				feeInNative,
			)

		const executionCostInUsd = bridgeFeeInUsd + txCostInUsd

		return {
			rate: calcRate(amountIn, amountOut),
			amountOut,
			executionCostInUsd,
		}
	}
}
