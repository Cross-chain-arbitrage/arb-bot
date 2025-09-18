import { Injectable } from '@nestjs/common'
import { EdgeQuoter } from '../../../application/interfaces/edge-quoter'
import { QuoterPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { StargateService } from '../../layerzero-bridges/stargate/stargate-service'
import { PriceOracleHelper } from '../../price-oracle/price-oracle-helper'
import { EvmTxCostHelper } from '../shared-helpers/chain-specific/evm/evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { STARGATE_PROTOCOL } from './constants'

@Injectable()
export class StargateQuoterPlugin extends EdgeHandler implements QuoterPlugin {
	constructor(
		private readonly stargateService: StargateService,
		private readonly evmTxCostHelper: EvmTxCostHelper,
		private readonly priceOracleHelper: PriceOracleHelper,
	) {
		super(STARGATE_PROTOCOL)
	}

	buildEdgeQuoter(
		edge: Edge<Token | NativeCurrency>,
	): EdgeQuoter | Promise<EdgeQuoter> {
		return {
			edge,
			quote: this.quote.bind(this, edge),
		}
	}

	async quote(
		edge: Edge<Token | NativeCurrency>,
		amountIn: bigint,
	): Promise<Quote> {
		const { amountOut, lzFee, gas } =
			await this.stargateService.quoteBridge(
				edge.from,
				amountIn,
				edge.to.chainId,
			)

		const txCostInUsd = await this.evmTxCostHelper.getExpectedTxCostInUsd(
			edge.from.chainId,
			gas,
		)

		const bridgeFeeInUsd =
			await this.priceOracleHelper.estimateUsdFromTokenAmount(
				lzFee.underlyingToken,
				lzFee.amount,
			)

		const executionCostInUsd = bridgeFeeInUsd + txCostInUsd

		return {
			rate: calcRate(amountIn, amountOut),
			amountOut,
			executionCostInUsd,
		}
	}
}
