import { Address } from "viem"
import { UNIV3_POOL_ABI } from "../../abi/univ3Pool"
import { Token } from "../tokens/Token"
import { ClientManager } from "../ClientManager"
import { TokenUtils } from "../tokens/TokenUtils"
import { BaseContract } from "../contracts/BaseContract"

export class BasePoolError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, BasePoolError.prototype)
		this.name = "BasePoolError"
	}
}

export abstract class BasePool extends BaseContract implements PoolImmutables {
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

	abstract getPrices(): Promise<number>

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
