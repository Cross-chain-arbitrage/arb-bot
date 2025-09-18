import { DecodeEventLogReturnType, isAddressEqual } from 'viem'
import {
	UNIV2_POOL_ABI,
	UNIV2_POOL_SWAP_EVENT,
} from '../../../evm/abi/uniV2/pool'
import { UNIV2_ROUTER_ABI } from '../../../evm/abi/uniV2/router'
import { Token } from '../../../evm/primitives/tokens/Token'
import { Pool } from '../pool'

type PoolWithFee = Pool & { fee: number }

export async function quoteSwapUniV2(this: PoolWithFee, params: SwapParams) {
	const reserves = await getReservesUniV2.bind(this)()

	const amountOut = calcAmountOutFromReserves.bind(this)(
		params.amountIn,
		reserves[0],
		reserves[1],
		isAddressEqual(params.tokenIn.address, this.token0.address),
	)

	return amountOut
}

export async function simulateSwapUniV2(this: PoolWithFee, params: SwapParams) {
	const { amountOut: amountOutExpected } = await this.quoteSwap(params)

	const slippage = BigInt(params.slippage ?? this.DEFAULT_SLIPPAGE)

	const amountOutMinimum = this.calcMinAmountOut(amountOutExpected, slippage)

	const { result, request } = await this.client.simulateContract({
		address: this.routerAddress,
		abi: UNIV2_ROUTER_ABI,
		functionName: 'swapExactTokensForTokens',
		account: this.account,
		args: [
			params.amountIn,
			amountOutMinimum,
			[params.tokenIn.address, params.tokenOut.address],
			this.account.address,
			this.calcDeadline(60 * 5),
		],
	})

	return {
		amountOut: result[result.length - 1],
		request: request as unknown as SimulateRequestWithAccount,
	}
}

export function defineAmountsFromEventUniV2(
	this: PoolWithFee,
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

export async function getPriceUniV2(this: Pool): Promise<{ price: number }> {
	const reserves = await getReservesUniV2.bind(this)()

	const price = calculatePriceFromReservesUniV2.bind(this)(reserves)

	return { price }
}

/* ======== HELPER FUNCTIONS ======== */

export async function getReservesUniV2(
	this: Pool,
): Promise<readonly [bigint, bigint, number]> {
	return this.client.readContract({
		address: this.address,
		abi: UNIV2_POOL_ABI,
		functionName: 'getReserves',
	})
}

export function calculatePriceFromReservesUniV2(
	this: Pool,
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

export function calcAmountOutFromReserves(
	this: PoolWithFee,
	amountIn: bigint,
	reserve0: bigint,
	reserve1: bigint,
	isFromToken0: boolean,
): bigint {
	const reserveIn = isFromToken0 ? reserve0 : reserve1
	const reserveOut = isFromToken0 ? reserve1 : reserve0

	const amountInWithFee =
		amountIn - (amountIn * BigInt(this.fee)) / this.BASIS_POINTS

	const numerator = amountInWithFee * reserveOut
	const denominator = reserveIn + amountInWithFee

	return numerator / denominator
}
