import { Cache } from '@nestjs/cache-manager'
import { RaydiumService } from '../../../../solana/raydium/raydium.service'
import { SolanaToken } from '../../../../solana/solana-tokens/solana-token'
import { EdgeHelperService } from '../edge-helper.service'
import { InchainEdge } from './inchain-edge'

export class RaydiumEdge extends InchainEdge {
	readonly id: EdgeId

	constructor(
		override readonly from: SolanaToken,
		override readonly to: SolanaToken,
		readonly raydiumService: RaydiumService,
		readonly edgeHelperService: EdgeHelperService,
		cacheService: Cache,
	) {
		super(from, to, cacheService)

		this.id = `${this.from.id}-${this.to.id}-${RaydiumEdge.name}`
	}

	async quote(amountIn: bigint): Promise<EdgeQuoteResult> {
		const { amountOut, unitConsumption } = await this.raydiumService.quote({
			tokenIn: this.from,
			tokenOut: this.to,
			amountIn,
		})

		const costInUsd = await this.edgeHelperService.getExpectedGasCostInUsd(
			this.from,
			BigInt(unitConsumption),
		)

		return {
			rate: this.calcRate(amountIn, amountOut),
			amountOut,
			costInUsd,
		}
	}

	async execute(amountIn: bigint): Promise<InchainEdgeExecutionResult> {
		const { amountOut, tx } = await this.raydiumService.swap({
			amountIn,
			tokenIn: this.from,
			tokenOut: this.to,
		})

		const costInUsd = await this.edgeHelperService.getActualGasCostInUsd(
			this.from,
			tx,
		)

		return {
			amountOut,
			txHash: tx.transaction.signatures[0],
			costInUsd,
		}
	}

	async approve(): Promise<(string | undefined)[]> {
		return Promise.resolve([])
	}
}
