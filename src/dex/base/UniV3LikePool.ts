import {
	Address,
	decodeEventLog,
	isAddressEqual,
	TransactionReceipt,
} from 'viem'
import { ALGEBRA_POOL_ABI } from '../../abi/algebra/algebraPool'
import { PANCAKE_V3_POOL_ABI } from '../../abi/pancakeV3/pancakeV3Pool'
import { UNIV3_POOL_ABI } from '../../abi/uniV3/uniV3Pool'
import { UNIV3_QUOTER_ABI } from '../../abi/uniV3/uniV3Quoter'
import { Token } from '../../primitives/tokens/Token'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../utils/ClientManager'
import { shortenAddress } from '../../utils/common'
import { POOL_CONFIGS, PoolType } from '../poolVariety'
import { Pool } from './Pool'

const BASIS_POINTS = 10000n

export abstract class UniV3LikePool extends Pool {
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

	async quoteSwap(params: SwapParams) {
		this.validateMismatchSwapParams(params)

		const { result } = await this.client.simulateContract({
			address: this.quoterAddress,
			abi: UNIV3_QUOTER_ABI,
			functionName: 'quoteExactInputSingle',
			account: this.account.address,
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

		return {
			amountOut: result[0],
			fee: this.fee,
		}
	}

	async getSwapArguments(params: SwapParams) {
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
			deadline: this.calcDeadline(60 * 5),
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

		const sqrtPriceX96 = (result as bigint[])[config.slotTickSpacingIndex]

		// Calculate price
		const price = this.sqrtPriceX96ToPrice(sqrtPriceX96)

		return { price, sqrtPriceX96 }
	}

	parseAmountOut(swapReceipt: TransactionReceipt): bigint {
		const swapEvent = swapReceipt.logs
			.map((log) => {
				if (!isAddressEqual(log.address, this.address)) return null

				let abi

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

		const amountOut =
			swapEvent.args.amount0 < 0n
				? -swapEvent.args.amount0
				: -swapEvent.args.amount1

		return amountOut
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
}
