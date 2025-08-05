import { Cache } from '@nestjs/cache-manager'
import { WrappedNative } from '../../../../primitives/tokens/WrappedNative'
import { shortenAddress } from '../../../../utils/common'
import { EdgeHelperService } from '../edge-helper.service'
import { InchainEdge } from './inchain-edge'

export class UnwrapEdge extends InchainEdge {
	readonly id: EdgeId

	constructor(
		override readonly from: GraphNode,
		override readonly to: GraphNode,
		readonly edgeHelperService: EdgeHelperService,
		cacheService: Cache,
	) {
		super(from, to, cacheService)
		this.id = `${this.from.id}-${this.to.id}-${this.constructor.name}`
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const costInUsd = await this.edgeHelperService.getExpectedGasCostInUsd(
			this.from,
			70000n,
		)
		return Promise.resolve({
			rate: 0,
			amountOut: amountIn,
			costInUsd,
		})
	}

	async execute(amountIn: bigint): Promise<InchainEdgeExecutionResult> {
		if (!(this.from instanceof WrappedNative)) {
			throw new Error(
				`Cannot unwrap non-WETH token: ${this.from.symbol} ${this.from.chainId} ${shortenAddress(this.from.address)}`,
			)
		}

		const receipt = await this.from.withdraw(amountIn)

		const costInUsd = await this.edgeHelperService.getActualGasCostInUsd(
			this.from,
			receipt,
		)

		// output amount is the same as input amount
		return {
			amountOut: amountIn,
			txHash: receipt.transactionHash,
			costInUsd,
		}
	}

	async approve(): Promise<string[]> {
		return Promise.resolve([])
	}
}
