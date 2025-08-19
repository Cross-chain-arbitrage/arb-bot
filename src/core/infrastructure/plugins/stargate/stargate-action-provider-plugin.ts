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
import { StargateService } from '../../layerzero-bridges/stargate/stargate-service'
import { EvmPluginHelper } from '../helpers/evm-plugin-helper'
import { PriceOracleHelper } from '../helpers/price-oracle-helper'
import { StargateGraphPlugin } from './stargate-graph-plugin'

@Injectable()
export class StargateActionProviderPlugin
	extends StargateGraphPlugin
	implements ActionProviderPlugin
{
	constructor(
		private readonly stargateService: StargateService,
		readonly evmPluginHelper: EvmPluginHelper,
		readonly priceOracleHelper: PriceOracleHelper,
	) {
		super()
	}

	buildEdgeActionProvider(
		edge: Edge<Token | NativeCurrency>,
	): CrosschainActionProvider {
		return {
			kind: 'crosschain',
			edge,
			execute: this.execute.bind(this, edge),
		}
	}

	async execute(
		edge: Edge<Token | NativeCurrency>,
		amountIn: bigint,
	): Promise<CrosschainExecution> {
		const bridgeResult = await this.stargateService.bridge(
			edge.from,
			edge.to,
			amountIn,
		)

		return {
			srcTxId: bridgeResult.bridgeTx.srcTx.hash,
			confirm: this.confirm.bind(this, edge, bridgeResult),
		}
	}

	async confirm(
		edge: Edge<Token | NativeCurrency>,
		bridgeResult: Awaited<ReturnType<typeof this.stargateService.bridge>>,
	): Promise<CrosschainConfirmation> {
		const bridgeTx = bridgeResult.bridgeTx

		await bridgeTx.waitForBridgeToFinish()

		if (!bridgeTx.dstTx) {
			throw new Error('No destination transaction found')
		}

		return {
			dstTxId: bridgeTx.dstTx.hash,
			amountOut: bridgeResult.amountOut,
			getExecutionCost: async () => {
				const parsedTx =
					await this.evmPluginHelper.waitForTransactionReceipt(
						edge.from.chainId,
						bridgeTx.srcTx.hash,
					)

				const txCostInUsd = await this.evmPluginHelper.getTxCostInUsd(
					edge.from.chainId,
					parsedTx,
				)

				const bridgeFeeInUsd =
					await this.priceOracleHelper.estimateUsdFromTokenAmount(
						bridgeResult.lzFee.underlyingToken,
						bridgeResult.lzFee.amount,
					)

				return {
					costInUsd: txCostInUsd + bridgeFeeInUsd,
				}
			},
		}
	}
}
