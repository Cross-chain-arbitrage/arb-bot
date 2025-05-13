import { Address } from "viem"
import { ALGEBRA_POOL_ABI } from "../abi/algebra/algebraPool"
import { BasePool } from "../utils/pools/BasePool"
import { Token } from "../utils/tokens/Token"
import { ClientManager } from "../utils/ClientManager"

/* ======== CONSTANTS ======== */

const BASIS_POINTS = 10000n

/* ======== MAIN CLASS ======== */

export class AlgebraPool extends BasePool {

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

	static async getPoolTokens(
		poolAddress: Address,
		chainId: number,
	): Promise<PoolTokens> {
		const client = ClientManager.getClient(chainId)

		const [token0, token1] = await Promise.all([
			client.readContract({
				address: poolAddress,
				abi: ALGEBRA_POOL_ABI,
				functionName: "token0",
			}),
			client.readContract({
				address: poolAddress,
				abi: ALGEBRA_POOL_ABI,
				functionName: "token1",
			}),
		])

		return { token0, token1 }
	}

	private calculateMinAmountOut(amount: bigint, slippage: number): bigint {
		return (
			(amount * BigInt(Math.floor((10000 - slippage) * 100))) /
			BASIS_POINTS
		)
	}

	async getPrices(): Promise<number> {
		const address = this.address

		const [sqrtPriceX96] = await this.client.readContract({
			address,
			abi: ALGEBRA_POOL_ABI,
			functionName: "globalState",
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
