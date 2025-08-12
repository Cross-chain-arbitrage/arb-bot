import { Cache } from '@nestjs/cache-manager'
import { Pool } from '../../../../dex/base/Pool'
import { Token } from '../../../../primitives/tokens/Token'
import { EdgeHelperService } from '../edge-helper.service'
import { InchainEdge } from './inchain-edge'

export class SwapEdge extends InchainEdge {
	readonly id: EdgeId

	constructor(
		override readonly from: Token,
		override readonly to: Token,
		readonly pool: Pool,
		readonly edgeHelperService: EdgeHelperService,
		cacheService: Cache,
	) {
		super(from, to, cacheService)

		this.id = `${this.from.id}-${this.to.id}-${SwapEdge.name}-${this.pool.address}`
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const { amountOut, gas } = await this.pool.quoteSwap({
			tokenIn: this.from,
			tokenOut: this.to,
			amountIn,
			slippage: 10n,
		})

		const costInUsd = await this.edgeHelperService.getExpectedGasCostInUsd(
			this.from,
			gas,
		)

		return {
			rate: this.calcRate(amountIn, amountOut),
			amountOut,
			costInUsd,
		}
	}

	async execute(amountIn: bigint): Promise<InchainEdgeExecutionResult> {
		const { amountOut, receipt } = await this.pool.swap({
			amountIn,
			tokenIn: this.from,
			tokenOut: this.to,
		})

		const costInUsd = await this.edgeHelperService.getActualGasCostInUsd(
			this.from,
			receipt,
		)

		return {
			amountOut,
			txHash: receipt.transactionHash,
			costInUsd,
		}
	}

	async approve(): Promise<(string | undefined)[]> {
		const txs = await this.pool.approveInfinite()

		return txs.map((tx) => tx?.transactionHash)
	}
}
