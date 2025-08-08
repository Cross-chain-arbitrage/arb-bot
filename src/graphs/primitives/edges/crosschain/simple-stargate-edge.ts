import { Cache } from '@nestjs/cache-manager'
import { SimpleStargateService } from '../../../../bridges/layerzero-bridges/stargate/simple-stargate.service'
import { EdgeHelperService } from '../edge-helper.service'
import { CrosschainEdge } from './crosschain-edge'

export class SimpleStargateBridgeEdge extends CrosschainEdge {
	readonly id: EdgeId

	constructor(
		override readonly from: GraphNode,
		override readonly to: GraphNode,
		readonly simpleStargate: SimpleStargateService,
		readonly edgeHelperService: EdgeHelperService,
		cacheService: Cache,
	) {
		super(from, to, cacheService)
		this.id = `${this.from.id}-${this.to.id}-${SimpleStargateBridgeEdge.name}`
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const { amountOut, feeInNative, gas } = await this.simpleStargate.quote(
			this.from,
			this.to,
			amountIn,
		)

		const costInUsd = await this.edgeHelperService.getExpectedTxCost(
			this.from,
			gas,
		)

		const native = this.edgeHelperService.getNative(this.from)

		const bridgeFeeInUsd =
			await this.edgeHelperService.getAdditionalCostInUsd(
				native,
				feeInNative,
			)

		return {
			rate: this.calcRate(amountIn, amountOut),
			amountOut,
			costInUsd: costInUsd + bridgeFeeInUsd,
		}
	}

	async execute(amountIn: bigint): Promise<CrosschainEdgeExecutionResult> {
		const { amountOut, feeInNative, txHash, waitForTx } =
			await this.simpleStargate.bridge(this.from, this.to, amountIn)

		const message = await waitForTx()

		const srcTxResult = await this.edgeHelperService.getTxResult(
			this.from,
			txHash,
		)

		const costInUsd = await this.edgeHelperService.getActualGasCostInUsd(
			this.from,
			srcTxResult,
		)

		const native = this.edgeHelperService.getNative(this.from)

		const bridgeFeeInUsd =
			await this.edgeHelperService.getAdditionalCostInUsd(
				native,
				feeInNative,
			)

		return {
			amountOut,
			srcTxHash: txHash,
			dstTxHash: message.dstTxHash as string,
			costInUsd: costInUsd + bridgeFeeInUsd,
		}
	}

	async approve(): Promise<(string | undefined)[]> {
		return Promise.resolve([])
	}
}
