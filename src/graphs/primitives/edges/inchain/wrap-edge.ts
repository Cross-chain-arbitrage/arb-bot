import { Cache } from '@nestjs/cache-manager'
import { NativeCurrency } from '../../../../primitives/tokens/NativeCurrency'
import { WrappedNative } from '../../../../primitives/tokens/WrappedNative'
import { EdgeHelperService } from '../edge-helper.service'
import { InchainEdge } from './inchain-edge'

export class WrapEdge extends InchainEdge {
	readonly id: EdgeId

	constructor(
		override readonly from: NativeCurrency,
		override readonly to: WrappedNative,
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
		const receipt = await this.to.deposit(amountIn)

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
