import { Injectable } from '@nestjs/common'

import {
	CrosschainActionProvider,
	CrosschainConfirmation,
	CrosschainExecution,
} from '../../../application/interfaces/edge-action-provider'
import { ActionProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { RelayService } from '../../relay/relay-service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { PriceOracleHelper } from '../helpers/price-oracle-helper'
import { SolanaEvmPluginHelper } from '../helpers/solana-evm-plugin-helper'
import { RelayGraphPlugin } from './relay-graph-plugin'

@Injectable()
export class RelayActionProviderPlugin
	extends RelayGraphPlugin
	implements ActionProviderPlugin
{
	constructor(
		private readonly relayService: RelayService,
		readonly solanaEvmPluginHelper: SolanaEvmPluginHelper,
		readonly priceOracleHelper: PriceOracleHelper,
	) {
		super()
	}

	buildEdgeActionProvider(edge: Edge<SolanaToken>): CrosschainActionProvider {
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
			dstTxId: awaitedBridge.dstTxHash,
			amountOut: bridgeResult.amountOut,
			getExecutionCost: async () => {
				const parsedTx =
					await this.solanaEvmPluginHelper.waitForTxResult(
						edge.from.chainId,
						bridgeResult.srcTxHash,
					)

				const costInUsd =
					await this.solanaEvmPluginHelper.getTxCostInUsd(
						edge.from.chainId,
						parsedTx,
					)

				return {
					costInUsd,
				}
			},
		}
	}
}
