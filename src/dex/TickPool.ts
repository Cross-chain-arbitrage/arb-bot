import { Token } from "../utils/tokens/Token"
import { BaseContract } from "../utils/contracts/BaseContract"
import { Address } from "viem"
import { ClientManager } from "../utils/ClientManager"
import { TokenUtils } from "../utils/tokens/TokenUtils"
import { UNIV3_POOL_ABI } from "../abi/univ3Pool"

export class TickPoolError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, TickPoolError.prototype)
		this.name = "TickPoolError"
	}
}

export class TickPool extends BaseContract implements PoolImmutables {
	constructor(
		poolAddress: Address,
		chainId: number,
		public readonly token0: Token,
		public readonly token1: Token,
		public readonly fee: number,
		public readonly tickSpacing: number,
	) {
		super(poolAddress, chainId)
	}

	static async getTokens(
		poolAddress: Address,
		chainId: number,
	): Promise<[Token, Token]> {
		const client = ClientManager.getClient(chainId)

		const [token0Address, token1Address] = await Promise.all([
			client.readContract({
				address: poolAddress,
				abi: UNIV3_POOL_ABI,
				functionName: "token0",
			}),
			client.readContract({
				address: poolAddress,
				abi: UNIV3_POOL_ABI,
				functionName: "token1",
			}),
		])

		const token0 = await TokenUtils.fromAddress<Token>(
			token0Address,
			chainId,
		)
		const token1 = await TokenUtils.fromAddress<Token>(
			token1Address,
			chainId,
		)

		return [token0, token1]
	}

	sqrtPriceX96ToPrice(
		sqrtPriceX96: bigint,
		decimals0: number,
		decimals1: number,
	): number {
		const price = Number(sqrtPriceX96) ** 2 / 2 ** 192
		return price * 10 ** (decimals0 - decimals1)
	}
}
