import { Injectable } from '@nestjs/common'
import {
	CrosschainConfirmation,
	CrosschainExecution,
	CrosschainExecutor,
} from '../../../application/interfaces/edge-executor'
import { ExecutorPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { SimpleStargateService } from '../../layerzero-bridges/stargate/simple-stargate.service'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { PriceOracleHelper } from '../helpers/price-oracle-helper'
import { SolanaEvmPluginHelper } from '../helpers/solana-evm-plugin-helper'
import { SimpleStargatePlugin } from './simple-stargate-plugin'

@Injectable()
export class SimpleStargateExecutorPlugin
	extends SimpleStargatePlugin
	implements ExecutorPlugin
{
	constructor(
		readonly simpleStargateService: SimpleStargateService,
		readonly solanaEvmPluginHelper: SolanaEvmPluginHelper,
		readonly priceOracleHelper: PriceOracleHelper,
	) {
		super()
	}

	buildEdgeExecutor(
		edge: Edge<Token | NativeCurrency | SolanaToken>,
	): CrosschainExecutor {
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
