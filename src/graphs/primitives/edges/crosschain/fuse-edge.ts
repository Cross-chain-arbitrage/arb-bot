import { Cache } from '@nestjs/cache-manager'
import { maxUint256 } from 'viem'
import { FuseBridgeService } from '../../../../bridges/layerzero-bridges/fuse-bridge/fuse-bridge.service'
import { ChainClientService } from '../../../../chain-client/chain-client.service'
import { NativeCurrency } from '../../../../primitives/tokens/NativeCurrency'
import { Token } from '../../../../primitives/tokens/Token'
import { EdgeHelperService } from '../edge-helper.service'
import { CrosschainEdge } from './crosschain-edge'

export class FuseBridgeEdge extends CrosschainEdge {
	readonly id: EdgeId

	constructor(
		override readonly from: Token | NativeCurrency,
		override readonly to: Token | NativeCurrency,
		readonly fuseBridge: FuseBridgeService,
		readonly chainClientService: ChainClientService,
		readonly edgeHelperService: EdgeHelperService,
		cacheService: Cache,
	) {
		super(from, to, cacheService)

		this.id = `${this.from.id}-${this.to.id}-${FuseBridgeEdge.name}`
	}

	async execute(amountIn: bigint): Promise<CrosschainEdgeExecutionResult> {
		const { bridgeTx, lzFee } = await this.fuseBridge.bridge(
			this.from as Token,
			this.to.chainId,
			this.chainClientService.getWalletClient(this.to.chainId).account
				.address,
			amountIn,
		)

		const srcTxReceipt = await this.chainClientService
			.getClient(this.from.chainId)
			.waitForTransactionReceipt({ hash: bridgeTx.srcTxHash })

		await bridgeTx.waitForBridgeToFinish()

		if (!bridgeTx.dstTxHash) {
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

		// output amount is the same as input amount
		// TODO: retrieve amount out from dst tx, because decimals could be different
		return {
			amountOut: amountIn,
			srcTxHash: bridgeTx.srcTxHash,
			dstTxHash: bridgeTx.dstTxHash,
			costInUsd: txCostInUsd + bridgeFeeInUsd,
		}
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const { amountOut, lzFee, gas } = await this.fuseBridge.quoteBridge(
			this.from,
			this.to.chainId,
			amountIn,
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

	async approve(): Promise<(string | undefined)[]> {
		const res = await this.fuseBridge.approveToBridge(
			this.from,
			maxUint256,
			this.to.chainId,
		)

		return [res?.transactionHash]
	}
}
