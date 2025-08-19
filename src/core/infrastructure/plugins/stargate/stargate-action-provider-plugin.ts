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
import { StargateService } from '../../layerzero-bridges/stargate/stargate-service'
import { estimateUsdFromTokenAmount } from '../helpers/context-helpers'
import { getTxCostInUsd } from '../helpers/evm-context-helpers'
import { StargateGraphPlugin } from './stargate-graph-plugin'

@Injectable()
export class StargateActionProviderPlugin
	extends StargateGraphPlugin
	implements ActionProviderPlugin
{
	constructor(
		private readonly stargateService: StargateService,
		private readonly chainClientService: ChainClientService,
		readonly priceOracle: PriceOracle,
		readonly tokenUtils: TokenUtils,
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
	): Promise<CrosschainExecutingResult> {
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
	): Promise<CrosschainConfirmingResult> {
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
					await this.chainClientService.waitForTransactionReceipt(
						edge.from.chainId,
						bridgeTx.srcTx.hash,
					)

				const txCostInUsd = await getTxCostInUsd.bind(this)(
					edge.from.chainId,
					parsedTx,
				)

				const bridgeFeeInUsd = await estimateUsdFromTokenAmount.bind(
					this,
				)(bridgeResult.lzFee.underlyingToken, bridgeResult.lzFee.amount)

				return {
					costInUsd: txCostInUsd + bridgeFeeInUsd,
				}
			},
		}
	}
}
