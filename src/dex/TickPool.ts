import { Token } from '../primitives/tokens/Token'
import { Address, TransactionReceipt } from 'viem'
import { ClientManager } from '../utils/ClientManager'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { UNIV3_POOL_ABI } from '../abi/uniV3/uniV3Pool'
import { isSameAddress } from '../utils/common'
import { Pool } from './Pool'

export class TickPoolError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, TickPoolError.prototype)
		this.name = 'TickPoolError'
	}
}

const BASIS_POINTS = 10000n

export abstract class TickPool extends Pool {
	public readonly fee: number
	public readonly tickSpacing: number

	public readonly routerAddress: Address
	public readonly quoterAddress: Address

	public readonly defaultSlippage: number = 50

	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
		periphery: PoolPeriphery,
	) {
		super(immutables.token0, immutables.token1, poolAddress, chainId)

		this.fee = immutables.fee
		this.tickSpacing = immutables.tickSpacing

		this.routerAddress = periphery.router
		this.quoterAddress = periphery.quoter
	}

	async validateSwapParams(params: SwapParams) {
		this.validateMismatchSwapParams(params)

		await Promise.all([
			this.validateBalance(params),
			this.validateAllowance(params),
		])
	}

	validateMismatchSwapParams(params: SwapParams) {
		if (isSameAddress(params.tokenIn.address, params.tokenOut.address)) {
			throw new Error('tokenIn and tokenOut cannot be the same')
		}
		if (
			!isSameAddress(params.tokenIn.address, this.token0.address) &&
			!isSameAddress(params.tokenIn.address, this.token1.address)
		) {
			throw new Error('tokenIn must be token0 or token1')
		}
		if (
			!isSameAddress(params.tokenOut.address, this.token0.address) &&
			!isSameAddress(params.tokenOut.address, this.token1.address)
		) {
			throw new Error('tokenOut must be token0 or token1')
		}
	}

	abstract quoteSwap(params: SwapParams): Promise<{
		amountOut: bigint
		fee: number
	}>

	async validateBalance(swapParams: SwapParams) {
		const { tokenIn, amountIn } = swapParams

		const balance = await tokenIn.balanceOf(this.account.address)

		if (balance < amountIn) {
			throw new Error(
				`Insufficient balance, needed ${amountIn}, has ${balance}`,
			)
		}
	}

	async validateAllowance(swapParams: SwapParams) {
		const { tokenIn, amountIn } = swapParams

		const allowance = await tokenIn.allowance(
			this.account.address,
			this.routerAddress,
		)

		if (allowance < amountIn) {
			throw new Error(
				`Insufficient allowance, needed ${amountIn}, has ${allowance}`,
			)
		}
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
				functionName: 'token0',
			}),
			client.readContract({
				address: poolAddress,
				abi: UNIV3_POOL_ABI,
				functionName: 'token1',
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

	calcMinAmountOut(amount: bigint, slippage: number): bigint {
		const bpNumber = Number(BASIS_POINTS)

		const minRatio = BigInt(Math.floor(bpNumber - slippage))

		return (amount * minRatio) / BASIS_POINTS
	}

	calcSqrtLimit(price: number, slippage: number, zeroToOne: boolean): bigint {
		const bpNumber = Number(BASIS_POINTS)
		return zeroToOne
			? this.priceToSqrtPriceX96(price * (1 - slippage / bpNumber))
			: this.priceToSqrtPriceX96(price * (1 + slippage / bpNumber))
	}

	calcDeadline(secondsToAdd: number) {
		return BigInt(Math.floor(Date.now() / 1000) + secondsToAdd)
	}

	// calcMinAmountOutAndSqrtLimit(params: SwapParams, price: number) {
	// 	const {
	// 		tokenIn,
	// 		tokenOut,
	// 		amountIn,
	// 		slippage = this.defaultSlippage,
	// 	} = params

	// 	const zeroToOne = this.zeroToOne(tokenIn)

	// 	const formattedAmountIn = divideByDecimals(amountIn, tokenIn.decimals)

	// 	const formattedAmountOutByPrice = zeroToOne
	// 		? formattedAmountIn * price
	// 		: formattedAmountIn / price

	// 	const amountOutByPrice = multiplyByDecimals(
	// 		formattedAmountOutByPrice,
	// 		tokenOut.decimals,
	// 	)

	// 	const amountOutMinimum = this.calcMinAmountOut(
	// 		amountOutByPrice,
	// 		slippage,
	// 	)

	// 	const sqrtMaxLimit = this.calcSqrtLimit(price, slippage, zeroToOne)

	// 	return { amountOutMinimum, sqrtMaxLimit }
	// }

	private zeroToOne(tokenIn: Token) {
		return isSameAddress(tokenIn.address, this.token0.address)
	}

	abstract getPrices(): Promise<{ price: number; sqrtPriceX96: bigint }>
	abstract simulateSwap(
		params: SwapParams, //TODO: remove any
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): Promise<{ amountOut: bigint; args: any }>
	abstract swap(params: SwapParams): Promise<{
		receipt: TransactionReceipt
		amountOut: bigint
	}>
}
