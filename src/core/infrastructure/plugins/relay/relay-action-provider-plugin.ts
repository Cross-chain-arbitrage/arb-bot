import { Injectable } from '@nestjs/common'

import {
	CrosschainActionProvider,
	CrosschainConfirmingResult,
	CrosschainExecutingResult,
} from '../../../application/interfaces/edge-action-provider'
import { ActionProviderPlugin } from '../../../application/interfaces/graph-plugin'
import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { Edge } from '../../../domain/entities/edge'
import { ChainClientService } from '../../evm/chain-client/chain-client.service'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { RelayService } from '../../relay/relay-service'
import { SolanaClientService } from '../../solana/solana-client.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'
import {
	getTxCostInUsd,
	waitForTxResult,
} from '../helpers/solana-evm-context-helpers'
import { RelayGraphPlugin } from './relay-graph-plugin'

@Injectable()
export class RelayActionProviderPlugin
	extends RelayGraphPlugin
	implements ActionProviderPlugin
{
	constructor(
		private readonly relayService: RelayService,
		readonly solanaTokenUtils: SolanaTokenUtils,
		readonly priceOracle: PriceOracle,
		readonly solanaClientService: SolanaClientService,
		readonly chainClientService: ChainClientService,
		readonly tokenUtils: TokenUtils,
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
	): Promise<CrosschainExecutingResult> {
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
	): Promise<CrosschainConfirmingResult> {
		const awaitedBridge = await bridgeResult.waitForBridge()

		return {
			dstTxId: awaitedBridge.dstTxHash,
			amountOut: bridgeResult.amountOut,
			getExecutionCost: async () => {
				const parsedTx = await waitForTxResult.bind(this)(
					edge.from.chainId,
					bridgeResult.srcTxHash,
				)

				const costInUsd = await getTxCostInUsd.bind(this)(
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
