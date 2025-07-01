import {
	Address,
	decodeEventLog,
	isAddressEqual,
	TransactionReceipt,
} from 'viem'
import { ALGEBRA_POOL_ABI } from '../../../abi/algebra/algebraPool'
import { PANCAKE_V3_POOL_ABI } from '../../../abi/pancakeV3/pancakeV3Pool'
import { UNIV3_POOL_ABI } from '../../../abi/uniV3/uniV3Pool'
import { UNIV3_QUOTER_ABI } from '../../../abi/uniV3/uniV3Quoter'
import { Token } from '../../../primitives/tokens/Token'
import { shortenAddress } from '../../../utils/common'
import { POOL_CONFIGS, PoolType } from '../../poolVariety'
import { UniV3LikePoolStatic } from './UniV3LikePoolStatic'

const BASIS_POINTS = 10000n

export type UniV3SwapArguments = {
	tokenIn: Address
	tokenOut: Address
	fee: number
	recipient: Address
	/** @dev Omitted in SwapRouter02 */
	deadline?: bigint
	amountIn: bigint
	amountOutMinimum: bigint
	sqrtPriceLimitX96: bigint
}

export abstract class UniV3LikePool extends UniV3LikePoolStatic {
	public readonly fee: number
	public readonly tickSpacing: number

	public readonly quoterAddress: Address

	public readonly defaultSlippage: number = 50

	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
		periphery: PoolPeriphery,
		poolType: PoolType,
	) {
		super(
			immutables.token0,
			immutables.token1,
			poolAddress,
			periphery.router,
			chainId,
			poolType,
			immutables.factory,
		)

		this.fee = immutables.fee
		this.tickSpacing = immutables.tickSpacing

		this.quoterAddress = periphery.quoter
	}

	async validateSwapParams(params: SwapParams) {
		this.validateMismatchSwapParams(params)

		await Promise.all([
			this.validateBalance(params),
			this.validateAllowance(params),
		])
	}

	async quoteSwapAmountOut(params: SwapParams) {
		this.validateMismatchSwapParams(params)

		const { result } = await this.client.simulateContract({
			address: this.quoterAddress,
			abi: UNIV3_QUOTER_ABI,
			functionName: 'quoteExactInputSingle',
			account: this.account,
			args: [
				{
					tokenIn: params.tokenIn.address,
					tokenOut: params.tokenOut.address,
					amountIn: params.amountIn,
					fee: this.fee,
					sqrtPriceLimitX96: 0n,
				},
			],
		})

		return result[0]
	}

	async getSwapArguments(
		params: SwapParams,
		is02Router?: boolean,
	): Promise<UniV3SwapArguments> {
		const { amountOut } = await this.quoteSwap(params)

		const amountOutMinimum = this.calcMinAmountOut(
			amountOut,
			params.slippage ?? this.defaultSlippage,
		)

		const args = {
			tokenIn: params.tokenIn.address,
			tokenOut: params.tokenOut.address,
			fee: this.fee,
			recipient: this.account.address,
			deadline: is02Router ? undefined : this.calcDeadline(60 * 5),
			amountIn: params.amountIn,
			amountOutMinimum,
			sqrtPriceLimitX96: 0n,
		}

		return args
	}

	validateMismatchSwapParams(params: SwapParams) {
		if (isAddressEqual(params.tokenIn.address, params.tokenOut.address)) {
			throw new this.customError(
				'tokenIn and tokenOut cannot be the same',
			)
		}

		if (
			!isAddressEqual(params.tokenIn.address, this.token0.address) &&
			!isAddressEqual(params.tokenIn.address, this.token1.address)
		) {
			throw new this.customError('tokenIn must be token0 or token1')
		}

		if (
			!isAddressEqual(params.tokenOut.address, this.token0.address) &&
			!isAddressEqual(params.tokenOut.address, this.token1.address)
		) {
			throw new this.customError(
				`tokenOut must be ${this.token0.symbol} (${this.token0.chainId}:${shortenAddress(this.token0.address)}) ` +
					`or ${this.token1.symbol} (${this.token1.chainId}:${shortenAddress(this.token1.address)}), ` +
					`got ${params.tokenOut.symbol} (${params.tokenOut.chainId}:${shortenAddress(params.tokenOut.address)})`,
			)
		}

		if (params.amountIn <= 0n) {
			throw new this.customError('amountIn cannot be 0 or negative')
		}
	}

	async validateBalance(swapParams: SwapParams) {
		const { tokenIn, amountIn } = swapParams

		const balance = await tokenIn.balanceOf(this.account.address)

		if (balance < amountIn) {
			throw new this.customError(
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
			throw new this.customError(
				`Insufficient allowance, needed ${amountIn}, has ${allowance}`,
			)
		}
	}

	async getPrices(): Promise<{ price: number; sqrtPriceX96: bigint }> {
		const address = this.address

		const config = POOL_CONFIGS[this.poolType] as V3PoolConfig

		const result = await this.client.readContract({
			address,
			abi: config.abi,
			functionName: config.slotFunction,
		})

		const sqrtPriceX96 = (result as bigint[])[config.sqrtPriceX96Index]

		// Calculate price
		const price = this.sqrtPriceX96ToPrice(sqrtPriceX96)

		return { price, sqrtPriceX96 }
	}

	parseAmounts(
		swapReceipt: TransactionReceipt,
		tokenIn: Token,
		tokenOut: Token,
	): { amountOut: bigint; amountIn: bigint } {
		const swapEvent = swapReceipt.logs
			.map((log) => {
				if (!isAddressEqual(log.address, this.address)) return null

				let abi:
					| typeof UNIV3_POOL_ABI
					| typeof PANCAKE_V3_POOL_ABI
					| typeof ALGEBRA_POOL_ABI

				switch (this.poolType) {
					case PoolType.UNIV3:
						abi = UNIV3_POOL_ABI
						break
					case PoolType.PANCAKEV3:
						abi = PANCAKE_V3_POOL_ABI
						break
					case PoolType.ALGEBRA:
						abi = ALGEBRA_POOL_ABI
						break
					default:
						throw new this.customError('Unsupported pool type')
				}

				const event = decodeEventLog({
					abi,
					data: log.data,
					topics: log.topics,
				})

				return event
			})
			.find((event) => event?.eventName === 'Swap')

		if (!swapEvent) throw new this.customError('Swap event not found')

		const zeroForOne = this.zeroForOne(tokenIn, tokenOut)

		const { amount0, amount1 } = swapEvent.args

		const [amountIn, amountOut] = zeroForOne
			? [amount0, -amount1]
			: [amount1, -amount0]

		return { amountOut, amountIn }
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
}
