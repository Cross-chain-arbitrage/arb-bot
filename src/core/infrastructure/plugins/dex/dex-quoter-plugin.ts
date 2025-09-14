import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EdgeQuoter } from '../../../application/interfaces/edge-quoter'
import { QuoterPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { calcRate } from '../../../domain/services/calc-rate'
import { Quote } from '../../../domain/value-objects/weighted-graph-snapshot'
import { PoolUtils } from '../../dex/pool-utils'
import { Token } from '../../evm/primitives/tokens/Token'
import { EvmTxCostHelper } from '../shared-helpers/chain-specific/evm/evm-tx-cost-helper'
import { DexPlugin } from './dex-plugin'

@Injectable()
export class DexQuoterPlugin extends DexPlugin implements QuoterPlugin {
	constructor(
		private readonly EvmTxCostHelper: EvmTxCostHelper,
		poolUtils: PoolUtils,
		configService: ConfigService,
	) {
		super(poolUtils, configService)
	}

	buildEdgeQuoter(edge: Edge<Token>): EdgeQuoter | Promise<EdgeQuoter> {
		return {
			edge,
			quote: this.quote.bind(this, edge),
		}
	}

	async quote(edge: Edge<Token>, amountIn: bigint): Promise<Quote> {
		const pool = await this.getPool(edge)

		const quote = await pool.quoteSwap({
			tokenIn: edge.from,
			tokenOut: edge.to,
			amountIn,
		})

		const executionCostInUsd =
			await this.EvmTxCostHelper.getExpectedTxCostInUsd(
				edge.from.chainId,
				quote.gas,
			)

		return {
			rate: calcRate(amountIn, quote.amountOut),
			amountOut: quote.amountOut,
			executionCostInUsd,
		}
	}
}
