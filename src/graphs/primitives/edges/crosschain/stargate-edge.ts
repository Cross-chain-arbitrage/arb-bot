import { Cache } from '@nestjs/cache-manager'
import { maxUint256 } from 'viem'
import { StargateService } from '../../../../bridges/layerzero-bridges/stargate/stargate-service'
import { ChainClientService } from '../../../../chain-client/chain-client.service'
import { NativeCurrency } from '../../../../primitives/tokens/NativeCurrency'
import { Token } from '../../../../primitives/tokens/Token'
import { EdgeHelperService } from '../edge-helper.service'
import { CrosschainEdge } from './crosschain-edge'

export class StargateBridgeEdge extends CrosschainEdge {
	readonly id: EdgeId

	constructor(
		override readonly from: Token | NativeCurrency,
		override readonly to: Token | NativeCurrency,
		readonly stargate: StargateService,
		readonly chainClientService: ChainClientService,
		readonly edgeHelperService: EdgeHelperService,
		cacheService: Cache,
	) {
		super(from, to, cacheService)

		this.id = `${this.from.id}-${this.to.id}-${StargateBridgeEdge.name}`
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const { amountOut, lzFee, gas } = await this.stargate.quoteBridge(
			this.from,
			amountIn,
			this.to.chainId,
		)

		const costInUsd = await this.edgeHelperService.getExpectedGasCostInUsd(
			this.from,
			gas,
		)

		const bridgeFeeInUsd =
			await this.edgeHelperService.getAdditionalCostInUsd(
				lzFee.underlyingToken,
				lzFee.amount,
			)

		const rate = this.calcRate(amountIn, amountOut)

		return {
			rate,
			amountOut,
			costInUsd: bridgeFeeInUsd + costInUsd,
		}
	}

	async execute(amountIn: bigint): Promise<CrosschainEdgeExecutionResult> {
		const { bridgeTx, lzFee, amountOut } = await this.stargate.bridge(
			this.from as NativeCurrency,
			this.to as NativeCurrency,
			amountIn,
		)

		const srcTxReceipt = await this.chainClientService
			.getClient(this.from.chainId)
			.waitForTransactionReceipt({ hash: bridgeTx.srcTx.hash })

		await bridgeTx.waitForBridgeToFinish()

		if (!bridgeTx.dstTx) {
			throw new Error('No destination transaction found')
		}

		const bridgeFeeInUsd =
			await this.edgeHelperService.getAdditionalCostInUsd(
				lzFee.underlyingToken,
				lzFee.amount,
			)

		const txCostInUsd = await this.edgeHelperService.getActualGasCostInUsd(
			this.from,
			srcTxReceipt,
		)

		return {
			amountOut,
			srcTxHash: bridgeTx.srcTxHash,
			dstTxHash: bridgeTx.dstTx.hash,
			costInUsd: txCostInUsd + bridgeFeeInUsd,
		}
	}

	async approve(): Promise<(string | undefined)[]> {
		const res = await this.stargate.approveToBridge(this.from, maxUint256)

		return [res?.transactionHash]
	}
}
