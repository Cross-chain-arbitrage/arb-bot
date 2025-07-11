import {
	Account,
	DecodeEventLogReturnType,
	isAddressEqual,
	SimulateContractReturnType,
} from 'viem'
import { UNIV2_POOL_ABI, UNIV2_POOL_SWAP_EVENT } from '../../abi/uniV2/pool'
import { UNIV2_ROUTER_ABI } from '../../abi/uniV2/router'
import { Token } from '../../primitives/tokens/Token'
import { Pool, PoolConstructorParams } from '../base/Pool'

const BASIS_POINTS = 10000n

export class UniV2Pool extends Pool {
	readonly fee: number = 30

	constructor(params: Omit<PoolConstructorParams, 'poolAbi'>) {
		super({
			...params,
			poolAbi: UNIV2_POOL_ABI,
		})
	}

	/* ======== OVERRIDE FUNCTIONS ======== */

	override async _quoteSwap(params: SwapParams) {
		const reserves = await this.getReserves()

		const amountOut = this.calculateAmountOut(
			params.amountIn,
			reserves[0],
			reserves[1],
			isAddressEqual(params.tokenIn.address, this.token0.address),
		)

		return amountOut
	}

	override async _simulateSwap(params: SwapParams) {
		const args = await this.getSwapArguments(params)

		const { result: amountOut, request } =
			await this.client.simulateContract({
				address: this.routerAddress,
				abi: UNIV2_ROUTER_ABI,
				functionName: 'swapExactTokensForTokens',
				account: this.account,
				args: [
					args.amountIn,
					args.amountOutMinimum,
					[args.tokenIn, args.tokenOut],
					args.recipient,
					this.calcDeadline(60 * 5),
				],
			})

		return {
			amountOut: amountOut[amountOut.length - 1],
			request:
				request as unknown as SimulateContractReturnType['request'] & {
					account: Account
				},
		}
	}

	override _isSwapEvent(
		event: DecodeEventLogReturnType<typeof UNIV2_POOL_ABI>,
	): boolean {
		return event.eventName === 'Swap'
	}

	override _defineAmountsFromEvent(
		swapEvent: DecodeEventLogReturnType<typeof UNIV2_POOL_SWAP_EVENT>,
		tokenIn: Token,
		tokenOut: Token,
	): { amountOut: bigint; amountIn: bigint } {
		const { amount0In, amount0Out, amount1In, amount1Out } = swapEvent.args

		const zeroForOne = this.zeroForOne(tokenIn, tokenOut)

		const [amountIn, amountOut] = zeroForOne
			? [amount0In, amount1Out]
			: [amount1In, amount0Out]

		return { amountOut, amountIn }
	}

	async getPrice(): Promise<{ price: number }> {
		const reserves = await this.getReserves()

		// Calculate price based on reserves
		const price = this.calculatePriceFromReserves(reserves)

		return { price }
	}

	/* ======== HELPER FUNCTIONS ======== */

	async getReserves(): Promise<readonly [bigint, bigint, number]> {
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

	private calculateAmountOut(
		amountIn: bigint,
		reserve0: bigint,
		reserve1: bigint,
		isFromToken0: boolean,
	): bigint {
		const reserveIn = isFromToken0 ? reserve0 : reserve1
		const reserveOut = isFromToken0 ? reserve1 : reserve0

		const amountInWithFee =
			amountIn - (amountIn * BigInt(this.fee)) / BASIS_POINTS

		const numerator = amountInWithFee * reserveOut
		const denominator = reserveIn + amountInWithFee

		return numerator / denominator
	}

	private async getSwapArguments(params: SwapParams) {
		const { amountOut } = await this.quoteSwap(params)

		const slippage = BigInt(params.slippage ?? 0)

		const amountOutMinimum =
			(amountOut * (BASIS_POINTS - slippage)) / BASIS_POINTS

		return {
			tokenIn: params.tokenIn.address,
			tokenOut: params.tokenOut.address,
			recipient: this.account.address,
			deadline: this.calcDeadline(60 * 5),
			amountIn: params.amountIn,
			amountOutMinimum,
		}
	}
}
