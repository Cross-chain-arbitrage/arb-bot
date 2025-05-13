import { Address } from "viem"
import { BasePool } from "../utils/pools/BasePool"
import { Token } from "../utils/tokens/Token"
import { UNIV3_POOL_ABI } from "../abi/univ3Pool"

export class UniV3Pool extends BasePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		token0: Token,
		token1: Token,
		fee: number,
		tickSpacing: number,
	) {
		super(poolAddress, chainId, token0, token1, fee, tickSpacing)
	}

	async getPrices(): Promise<number> {
		const address = this.address

		const [sqrtPriceX96] = await this.client.readContract({
			address,
			abi: UNIV3_POOL_ABI,
			functionName: "slot0",
		})

		const token0Decimals = this.token0.decimals
		const token1Decimals = this.token1.decimals

		// Calculate price
		const price = this.sqrtPriceX96ToPrice(
			sqrtPriceX96,
			token0Decimals,
			token1Decimals,
		)

		return price
	}
}
