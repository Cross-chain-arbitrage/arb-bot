import { Injectable } from '@nestjs/common'

import {
	CrosschainConfirmation,
	CrosschainExecution,
	CrosschainExecutor,
} from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { TokenIdUtils } from '../../../domain/services/token-id-utils'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { PriceOracleHelper } from '../../price-oracle/price-oracle-helper'
import { RelayService } from '../../relay/relay-service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaEvmHelper } from '../shared-helpers/chain-specific/solana-evm/solana-evm-helper'
import { SolanaEvmTxCostHelper } from '../shared-helpers/chain-specific/solana-evm/solana-evm-tx-cost-helper'
import { EdgeHandler } from '../shared-implementation/edge-handler'
import { RELAY_PROTOCOL } from './constants'

@Injectable()
export class RelayExecutorPlugin extends EdgeHandler implements ExecutorPlugin {
	constructor(
		private readonly relayService: RelayService,
		readonly solanaEvmTxCostHelper: SolanaEvmTxCostHelper,
		readonly priceOracleHelper: PriceOracleHelper,
		readonly solanaEvmHelper: SolanaEvmHelper,
	) {
		super(RELAY_PROTOCOL)
	}

	buildEdgeExecutor(edge: Edge<SolanaToken>): CrosschainExecutor {
		return {
			kind: 'crosschain',
			edge,
			execute: this.execute.bind(this, edge),
		}
	}

	async execute(
		edge: Edge<SolanaToken>,
		amountIn: bigint,
	): Promise<CrosschainExecution> {
		const result = await this.relayService.bridge(
			edge.from,
			edge.to,
			amountIn,
		)

		return {
			srcTxId: result.srcTxHash,
			confirm: this.confirm.bind(this, edge, result),
		}
	}

	async confirm(
		edge: Edge<SolanaToken | Token | NativeCurrency>,
		bridgeResult: Awaited<ReturnType<typeof this.relayService.bridge>>,
	): Promise<CrosschainConfirmation> {
		const awaitedBridge = await bridgeResult.waitForBridge()

		return {
			status: 'success',
			dstTxId: awaitedBridge.dstTxHash,
			amountOut: bridgeResult.amountOut,
			getExecutionCost: async () => {
				const chainId = TokenIdUtils.parseId(edge.from.id).chainId

				const parsedTx = await this.solanaEvmHelper.waitForTxResult(
					chainId,
					bridgeResult.srcTxHash,
				)

				const costInUsd =
					await this.solanaEvmTxCostHelper.getTxCostInUsd(
						chainId,
						parsedTx,
					)

				return {
					costInUsd,
				}
			},
		}
	}
}
