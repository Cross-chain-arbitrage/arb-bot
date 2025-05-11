import { Address } from "viem"
import { ALGEBRA_POOL_ABI } from "../abi/algebra/algebraPool"
import { Token } from "../utils/token"
import { BaseContract } from "../utils/BaseContract"
import { fuse } from "viem/chains"

/* ======== TYPES ======== */

interface SwapParams {
	tokenIn: Token
	tokenOut: Token
	amountIn: bigint
	zeroToOne: boolean
	slippage: number // in basis points (e.g., 50 = 0.5%)
}

interface SwapResult {
	amountIn: bigint
	amountOut: bigint
	priceImpact: number
}

interface PoolTokens {
	token0: Address
	token1: Address
}

/* ======== CONSTANTS ======== */

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const BASIS_POINTS = 10000n
const NO_PRICE_LIMIT = 0n

/* ======== ERRORS ======== */

class TokenOrderMismatchError extends Error {
	constructor() {
		super("Token order mismatch")
		this.name = "TokenOrderMismatchError"
	}
}

/* ======== MAIN CLASS ======== */

export class AlgebraPool extends BaseContract {
	constructor(chainId: number, poolAddress: Address) {
		super(chainId, poolAddress)
	}

	private async getPoolTokens(): Promise<PoolTokens> {
		const abi = ALGEBRA_POOL_ABI
		const address = this.contractAddress

		const [token0, token1] = await Promise.all([
			this.client.readContract({
				address,
				abi,
				functionName: "token0",
			}),
			this.client.readContract({
				address,
				abi,
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

	private calculatePriceImpact(
		amountIn: bigint,
		amountOut: bigint,
		tokenIn: Token,
		tokenOut: Token,
	): number {
		// TODO: Implement proper price impact calculation
		return 0
	}

	private validateTokenOrder(
		tokenIn: Token,
		token0: Address,
		token1: Address,
		zeroToOne: boolean,
	): void {
		if (zeroToOne && tokenIn.address !== token0) {
			throw new TokenOrderMismatchError()
		}
		if (!zeroToOne && tokenIn.address !== token1) {
			throw new TokenOrderMismatchError()
		}
	}

	async simulateSwap(params: SwapParams): Promise<SwapResult> {
		const { tokenIn, tokenOut, amountIn, zeroToOne } = params

		// Get pool tokens and validate order
		const { token0, token1 } = await this.getPoolTokens()
		this.validateTokenOrder(tokenIn, token0, token1, zeroToOne)

		// Simulate swap
		const { result } = await this.client.simulateContract({
			address: this.contractAddress,
			abi: ALGEBRA_POOL_ABI,
			functionName: "swap",
			args: [ZERO_ADDRESS, zeroToOne, amountIn, NO_PRICE_LIMIT, "0x"],
		})

		const [amount0, amount1] = result
		const amountOut = zeroToOne ? -amount1 : -amount0

		return {
			amountIn,
			amountOut,
			priceImpact: this.calculatePriceImpact(
				amountIn,
				amountOut,
				tokenIn,
				tokenOut,
			),
		}
	}

	async swap(params: SwapParams): Promise<SwapResult> {
		const { amountIn, zeroToOne } = params

		// Simulate first
		const simulation = await this.simulateSwap(params)

		// Execute swap
		const hash = await this.wallet.writeContract({
			address: this.contractAddress,
			abi: ALGEBRA_POOL_ABI,
			account: this.account,
			chain: this.wallet.chain,
			functionName: "swap",
			args: [
				this.account.address || ZERO_ADDRESS,
				zeroToOne,
				amountIn,
				NO_PRICE_LIMIT,
				"0x",
			],
		})

		// Wait for transaction
		await this.client.waitForTransactionReceipt({ hash })

		return simulation
	}
}

async function main() {
	const chainId = fuse.id
	const poolAddress = "0x0000000000000000000000000000000000000000"
	const algebraPool = new AlgebraPool(chainId, poolAddress)

	const tokenIn = await Token.fromAddress(
		"0x0000000000000000000000000000000000000000",
		chainId,
	)
	const tokenOut = await Token.fromAddress(
		"0x0000000000000000000000000000000000000000",
		chainId,
	)

	const amountIn = tokenIn.parseUnits("1")
	const slippage = 50 // BPS

	const params = {
		tokenIn,
		tokenOut,
		amountIn,
		zeroToOne: true,
		slippage,
	}

	// Simulate
	const simulation = await algebraPool.simulateSwap(params)
	console.log("Simulation:", simulation)

	// Execute
	const result = await algebraPool.swap(params)
	console.log("Execution:", result)
}

main().catch(console.error)
