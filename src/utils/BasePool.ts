import { Address } from "viem"
import { Token } from "./token"
import { BaseContract } from "./BaseContract"

/* ======== TYPES ======== */

export interface PoolTokens {
	token0: Address
	token1: Address
}

export interface SwapParams {
	tokenIn: Token
	tokenOut: Token
	amountIn: bigint
	slippage: number
}

export interface SwapResult {
	amountIn: bigint
	amountOut: bigint
	priceImpact: number
}

/* ======== CONSTANTS ======== */

export const BASIS_POINTS = 10000n

/* ======== ERRORS ======== */

export class TokenOrderMismatchError extends Error {
	constructor() {
		super("Token order mismatch")
		this.name = "TokenOrderMismatchError"
	}
}

/* ======== MAIN CLASS ======== */

export abstract class BasePool extends BaseContract {
	protected readonly _baseAbi = [
		"function token0() view returns (address)",
		"function token1() view returns (address)",
	] as const

	protected readonly token0: Address
	protected readonly token1: Address

	constructor(chainId: number, poolAddress: Address) {
		super(chainId, poolAddress)
		// Initialize with zero address, will be set in init()
		this.token0 = "0x0000000000000000000000000000000000000000"
		this.token1 = "0x0000000000000000000000000000000000000000"
	}

	protected async init(): Promise<void> {
		const [token0, token1] = await Promise.all([
			this.client.readContract({
				address: this.contractAddress,
				abi: this._baseAbi,
				functionName: "token0",
			}),
			this.client.readContract({
				address: this.contractAddress,
				abi: this._baseAbi,
				functionName: "token1",
			}),
		])

		// Use Object.defineProperty to set readonly properties
		Object.defineProperty(this, "token0", { value: token0 })
		Object.defineProperty(this, "token1", { value: token1 })
	}

	protected async getPoolTokens(): Promise<PoolTokens> {
		if (this.token0 === "0x0000000000000000000000000000000000000000") {
			await this.init()
		}
		return { token0: this.token0, token1: this.token1 }
	}

	protected calculateMinAmountOut(amount: bigint, slippage: number): bigint {
		return (
			(amount * BigInt(Math.floor((10000 - slippage) * 100))) /
			BASIS_POINTS
		)
	}

	protected calculatePriceImpact(
		amountIn: bigint,
		amountOut: bigint,
		tokenIn: Token,
		tokenOut: Token,
	): number {
		// TODO: Implement proper price impact calculation
		return 0
	}

	protected async validateTokens(
		tokenIn: Token,
		tokenOut: Token,
	): Promise<boolean> {
		const { token0, token1 } = await this.getPoolTokens()
		return (
			(tokenIn.address === token0 && tokenOut.address === token1) ||
			(tokenIn.address === token1 && tokenOut.address === token0)
		)
	}

	abstract simulate(params: SwapParams): Promise<SwapResult>
	abstract execute(params: SwapParams): Promise<SwapResult>
}
