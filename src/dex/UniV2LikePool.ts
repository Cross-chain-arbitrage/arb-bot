import { decodeEventLog, isAddressEqual } from 'viem'
import { UNIV2_POOL_ABI } from '../abi/uniV2/pool'
import { UNIV2_ROUTER_ABI } from '../abi/uniV2/router'
import { Token } from '../primitives/tokens/Token'

import { Pool } from './Pool'

export class UniV2LikePoolError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, UniV2LikePoolError.prototype)
		this.name = 'UniV2LikePoolError'
	}
}

const BASIS_POINTS = 10000n

export abstract class UniV2LikePool extends Pool {
	fee: number
	constructor(
		public readonly token0: Token,
		public readonly token1: Token,
		poolAddress: Address,
		routerAddress: Address,
		public chainId: number,
		fee: number,
	) {
		super(token0, token1, poolAddress, routerAddress, chainId)
		this.fee = fee
	}

	async getPrices(): Promise<{ price: number; sqrtPriceX96: bigint }> {
		const reserves = await this.getReserves()

		// Calculate price based on reserves
		const price = this.calculatePriceFromReserves(reserves)
		// For compatibility with TickPool interface, we'll use a dummy sqrtPriceX96
		const sqrtPriceX96 = 0n

		return { price, sqrtPriceX96 }
	}

	getReserves(): Promise<readonly [bigint, bigint, number]> {
		return this.client.readContract({
			address: this.address,
			abi: UNIV2_POOL_ABI,
			functionName: 'getReserves',
		})
	}

	private calculatePriceFromReserves(
		reserves: readonly [bigint, bigint, number],
	) {
		const [_reserve0, _reserve1] = reserves
		const token0Decimals = this.token0.decimals
		const token1Decimals = this.token1.decimals

		// Adjust for decimals
		const reserve0 = Number(_reserve0) / Math.pow(10, token0Decimals)
		const reserve1 = Number(_reserve1) / Math.pow(10, token1Decimals)

		return reserve1 / reserve0
	}

	async quoteSwap(params: SwapParams) {
		this.validateMismatchSwapParams(params)

		const reserves = await this.getReserves()

		const amountOut = this.calculateAmountOut(
			params.amountIn,
			reserves[0],
			reserves[1],
			isAddressEqual(params.tokenIn.address, this.token0.address),
		)

		return {
			amountOut,
			fee: this.fee / Number(BASIS_POINTS),
		}
	}

	private calculateAmountOut(
		amountIn: bigint,
		reserve0: bigint,
		reserve1: bigint,
		isFromToken0: boolean,
	): bigint {
		const reserveIn = isFromToken0 ? reserve0 : reserve1
		const reserveOut = isFromToken0 ? reserve1 : reserve0

		const amountInWithFee = amountIn * (BASIS_POINTS - BigInt(this.fee))
		const numerator = amountInWithFee * reserveOut
		const denominator = reserveIn * BASIS_POINTS + amountInWithFee

		return numerator / denominator
	}

	async getSwapArguments(params: SwapParams) {
		const { amountOut } = await this.quoteSwap(params)

		const slippage = BigInt(params.slippage ?? 0)

		const amountOutMinimum = (amountOut * (10000n - slippage)) / 10000n

		return {
			tokenIn: params.tokenIn.address,
			tokenOut: params.tokenOut.address,
			recipient: this.account.address,
			deadline: this.calcDeadline(60 * 5),
			amountIn: params.amountIn,
			amountOutMinimum,
		}
	}

	async simulateSwap(params: SwapParams) {
		this.validateMismatchSwapParams(params)

		const args = await this.getSwapArguments(params)

		const { result: amountOut } = await this.client.simulateContract({
			address: this.routerAddress,
			abi: UNIV2_ROUTER_ABI,
			functionName: 'swapExactTokensForTokens',
			account: this.account.address,
			args: [
				args.amountIn,
				args.amountOutMinimum,
				[args.tokenIn, args.tokenOut],
				args.recipient,
				this.calcDeadline(60 * 5),
			],
		})

		return { amountOut: amountOut[amountOut.length - 1], args }
	}

	async swap(params: SwapParams) {
		const { args } = await this.simulateSwap(params)

		const hash = await this.wallet.writeContract({
			address: this.routerAddress,
			abi: UNIV2_ROUTER_ABI,
			account: this.account,
			chain: this.wallet.chain,
			functionName: 'swapExactTokensForTokens',
			args: [
				args.amountIn,
				args.amountOutMinimum,
				[args.tokenIn, args.tokenOut],
				args.recipient,
				args.deadline,
			],
		})

		const receipt = await this.client.waitForTransactionReceipt({ hash })

		if (receipt.status !== 'success')
			throw new UniV2LikePoolError(`Swap failed, tx: ${hash}`)

		const swapEvent = receipt.logs
			.map((log) => {
				if (!isAddressEqual(log.address, this.address)) return null

				const event = decodeEventLog({
					abi: UNIV2_POOL_ABI,
					data: log.data,
					topics: log.topics,
				})

				return event
			})
			.find((event) => event?.eventName === 'Swap')

		if (!swapEvent) throw new UniV2LikePoolError('Swap event not found')

		const amountOut =
			swapEvent.args.amount0Out > 0n
				? swapEvent.args.amount0Out
				: swapEvent.args.amount1Out

		return { receipt, amountOut }
	}

	validateMismatchSwapParams(params: SwapParams) {
		if (params.tokenIn.isSame(params.tokenOut)) {
			throw new UniV2LikePoolError(
				'Token in and token out cannot be the same',
			)
		}

		const allowedTokens = [this.token0, this.token1]

		const isTokenInOneOfAllowed = allowedTokens.some((token) =>
			token.isSame(params.tokenIn),
		)

		if (!isTokenInOneOfAllowed) {
			throw new UniV2LikePoolError(
				`Incorrect token in: ${params.tokenIn.address}:${params.tokenIn.chainId}`,
			)
		}

		const isTokenOutOneOfAllowed = allowedTokens.some((token) =>
			token.isSame(params.tokenOut),
		)

		if (!isTokenOutOneOfAllowed) {
			throw new UniV2LikePoolError(
				`Incorrect token out: ${params.tokenOut.address}:${params.tokenOut.chainId}`,
			)
		}

		if (params.amountIn <= 10n) {
			throw new UniV2LikePoolError(
				`Amount in is too low, ${params.tokenIn.formatUnits(params.amountIn)} ${params.tokenIn.symbol}`,
			)
		}

		if (params.slippage && params.slippage >= 3000) {
			throw new UniV2LikePoolError(
				`Slippage is too high: ${(params.slippage / 10000) * 100}%`,
			)
		}
	}

	calcDeadline(secondsToAdd: number): bigint {
		return BigInt(Math.floor(Date.now() / 1000) + secondsToAdd)
	}
}
