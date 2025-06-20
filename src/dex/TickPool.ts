import { Address, isAddressEqual, TransactionReceipt } from 'viem'
import { UNIV3_POOL_ABI } from '../abi/uniV3/uniV3Pool'
import { Token } from '../primitives/tokens/Token'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { ClientManager } from '../utils/ClientManager'
import { shortenAddress } from '../utils/common'
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

	public readonly quoterAddress: Address

	public readonly defaultSlippage: number = 50

	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
		periphery: PoolPeriphery,
	) {
		super(
			immutables.token0,
			immutables.token1,
			poolAddress,
			periphery.router,
			chainId,
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

	validateMismatchSwapParams(params: SwapParams) {
		if (isAddressEqual(params.tokenIn.address, params.tokenOut.address)) {
			throw new TickPoolError('tokenIn and tokenOut cannot be the same')
		}

		if (
			!isAddressEqual(params.tokenIn.address, this.token0.address) &&
			!isAddressEqual(params.tokenIn.address, this.token1.address)
		) {
			throw new TickPoolError('tokenIn must be token0 or token1')
		}

		if (
			!isAddressEqual(params.tokenOut.address, this.token0.address) &&
			!isAddressEqual(params.tokenOut.address, this.token1.address)
		) {
			throw new TickPoolError(
				`tokenOut must be ${this.token0.symbol} (${this.token0.chainId}:${shortenAddress(this.token0.address)}) ` +
					`or ${this.token1.symbol} (${this.token1.chainId}:${shortenAddress(this.token1.address)}), ` +
					`got ${params.tokenOut.symbol} (${params.tokenOut.chainId}:${shortenAddress(params.tokenOut.address)})`,
			)
		}

		if (params.amountIn <= 0n) {
			throw new TickPoolError('amountIn cannot be 0 or negative')
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
			throw new TickPoolError(
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
			throw new TickPoolError(
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

	multiplyGas(gas: bigint) {
		//TODO: remove magic number
		return (gas * 15n) / 10n
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
