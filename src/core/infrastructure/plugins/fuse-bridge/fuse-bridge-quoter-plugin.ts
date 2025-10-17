import { Injectable } from '@nestjs/common'
import { EdgeQuoter } from '../../../application/interfaces/edge-quoter'
import { QuoterPlugin } from '../../../application/interfaces/graph-plugin'
import { TokenValuator } from '../../../application/use-cases/token-valuator/token-valuator'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/quote'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { FuseBridgeService } from '../../layerzero-bridges/fuse-bridge/fuse-bridge.service'
import { EvmTxCostHelper } from '../shared-helpers/chain-specific/evm/evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { FUSE_BRIDGE_PROTOCOL } from './constants'

@Injectable()
export class FuseBridgeQuoterPlugin
	extends EdgeHandler
	implements QuoterPlugin
{
	constructor(
		private readonly fuseBridgeService: FuseBridgeService,
		private readonly evmTxCostHelper: EvmTxCostHelper,
		private readonly tokenValuator: TokenValuator,
	) {
		super(FUSE_BRIDGE_PROTOCOL)
	}

	buildEdgeQuoter(
		edge: Edge<Token | NativeCurrency>,
	): EdgeQuoter | Promise<EdgeQuoter> {
		return {
			edge,
			quote: (amountIn: bigint) => this.quote(edge, amountIn),
		}
	}

	async quote(
		edge: Edge<Token | NativeCurrency>,
		amountIn: bigint,
	): Promise<Quote> {
		const { amountOut, lzFee, gas } =
			await this.fuseBridgeService.quoteBridge(
				edge.from,
				edge.to,
				amountIn,
			)

		const txCostInUsd = await this.evmTxCostHelper.getExpectedTxCostInUsd(
			edge.from.chainId,
			gas,
		)

		const bridgeFeeInUsd =
			await this.tokenValuator.estimateUsdFromTokenAmount(
				lzFee.underlyingToken,
				lzFee.amount,
			)

		const executionCostInUsd = bridgeFeeInUsd + txCostInUsd

		return {
			negativeLogRate: calcRate(amountIn, amountOut),
			amountOut,
			expectedCostInUsd: executionCostInUsd,
		}
	}
}
