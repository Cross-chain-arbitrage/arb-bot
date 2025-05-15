import { Token } from '../utils/tokens/Token'
import { BaseContract } from '../utils/contracts/BaseContract'
import { Address, TransactionReceipt } from 'viem'
import { ClientManager } from '../utils/ClientManager'
import { TokenUtils } from '../utils/tokens/TokenUtils'
import { UNIV3_POOL_ABI } from '../abi/univ3Pool'
import { divideByDecimals, isSameAddress } from '../utils/common'
import { multiplyByDecimals } from '../utils/common'

export class TickPoolError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, TickPoolError.prototype)
		this.name = 'TickPoolError'
	}
}

const BASIS_POINTS = 10000n

export abstract class TickPool extends BaseContract {
	public readonly token0: Token
	public readonly token1: Token
	public readonly fee: number
	public readonly tickSpacing: number
	public readonly defaultSlippage: number = 50

	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
		public readonly routerAddress: Address,
	) {
		super(poolAddress, chainId)

		this.token0 = immutables.token0
		this.token1 = immutables.token1
		this.fee = immutables.fee
		this.tickSpacing = immutables.tickSpacing
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

	calcMinAmountOutAndSqrtLimit(params: SwapParams, price: number) {
		const {
			tokenIn,
			tokenOut,
			amountIn,
			slippage = this.defaultSlippage,
		} = params

		const zeroToOne = this.zeroToOne(tokenIn)

		const formattedAmountIn = divideByDecimals(amountIn, tokenIn.decimals)

		const formattedAmountOutByPrice = zeroToOne
			? formattedAmountIn * price
			: formattedAmountIn / price

		const amountOutByPrice = multiplyByDecimals(
			formattedAmountOutByPrice,
			tokenOut.decimals,
		)

		const amountOutMinimum = this.calcMinAmountOut(
			amountOutByPrice,
			slippage,
		)

		const sqrtMaxLimit = this.calcSqrtLimit(price, slippage, zeroToOne)

		return { amountOutMinimum, sqrtMaxLimit }
	}

	private zeroToOne(tokenIn: Token) {
		return isSameAddress(tokenIn.address, this.token0.address)
	}

	abstract getPrices(): Promise<{ price: number; sqrtPriceX96: bigint }>
	abstract simulateSwap(
		params: SwapParams,
	): Promise<{ amountOut: bigint; args: SwapArgs }>
	abstract swap(params: SwapParams): Promise<{
		receipt: TransactionReceipt
		amountOut: bigint
	}>
}
