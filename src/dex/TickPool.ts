import { Token } from "../utils/tokens/Token"
import { BaseContract } from "../utils/contracts/BaseContract"
import { Address, TransactionReceipt } from "viem"
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

const BASIS_POINTS = 10000n

export abstract class TickPool extends BaseContract {
	constructor(
		poolAddress: Address,
		chainId: number,
		public readonly token0: Token,
		public readonly token1: Token,
		public readonly fee: number,
		public readonly tickSpacing: number,
		public readonly routerAddress: Address,
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

	sqrtPriceX96ToPrice(sqrtPriceX96: bigint): number {
		const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96

		const price = sqrtPrice ** 2

		return price * 10 ** (this.token0.decimals - this.token1.decimals)
	}

	priceToSqrtPriceX96(price: number): bigint {
		const adjustedPrice =
			price / 10 ** (this.token0.decimals - this.token1.decimals)

		const sqrtPrice = Math.sqrt(adjustedPrice)

		return BigInt(Math.floor(sqrtPrice * 2 ** 96))
	}

	calculateMinAmountOut(amount: bigint, slippage: number): bigint {
		return (
			(amount * BigInt(Math.floor((10000 - slippage) * 100))) /
			BASIS_POINTS
		)
	}

	abstract getPrices(): Promise<{ price: number; sqrtPriceX96: bigint }>
	abstract simulateSwap(
		params: SwapParams,
	): Promise<{ amountOut: bigint; args: SwapArgs }>
	abstract swap(params: SwapParams): Promise<{ receipt: TransactionReceipt }>
}
