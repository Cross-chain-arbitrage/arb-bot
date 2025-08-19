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
import { SimpleStargateService } from '../../layerzero-bridges/stargate/simple-stargate.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { PriceOracleHelper } from '../helpers/price-oracle-helper'
import { SolanaEvmPluginHelper } from '../helpers/solana-evm-plugin-helper'
import { SimpleStargateGraphPlugin } from './simple-stargate-graph-plugin'

@Injectable()
export class SimpleStargateActionProviderPlugin
	extends SimpleStargateGraphPlugin
	implements ActionProviderPlugin
{
	constructor(
		readonly simpleStargateService: SimpleStargateService,
		readonly solanaEvmPluginHelper: SolanaEvmPluginHelper,
		readonly priceOracleHelper: PriceOracleHelper,
	) {
		super()
	}

	buildEdgeActionProvider(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
	): CrosschainActionProvider {
		return {
			kind: 'crosschain',
			edge,
			execute: this.execute.bind(this, edge),
		}
	}

	async execute(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
		amountIn: bigint,
	): Promise<CrosschainExecution> {
		const result = await this.simpleStargateService.bridge(
			edge.from,
			edge.to,
			amountIn,
		)

		return {
			srcTxId: result.txHash,
			confirm: this.confirm.bind(this, edge, result),
		}
	}

	async confirm(
		edge: Edge<SolanaToken | Token | NativeCurrency>,
		bridgeResult: Awaited<
			ReturnType<typeof this.simpleStargateService.bridge>
		>,
	): Promise<CrosschainConfirmation> {
		const awaitedBridge = await bridgeResult.waitForBridge()

		const dstTxId = awaitedBridge.dstTxHash

		if (!dstTxId) {
			throw new Error('Destination transaction not found')
		}

		return {
			dstTxId,
			amountOut: bridgeResult.amountOut,
			getExecutionCost: async () => {
				const parsedTx =
					await this.solanaEvmPluginHelper.waitForTxResult(
						edge.from.chainId,
						bridgeResult.txHash,
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
