import { Abi, DecodeEventLogReturnType } from 'viem'
import { UNIV3_POOL_SWAP_EVENT_ABI } from '../../../abi/uniV3/uniV3Pool'
import { UNIV3_QUOTER_ABI } from '../../../abi/uniV3/uniV3Quoter'
import { UNIV3_ROUTER_ABI } from '../../../abi/uniV3/uniV3Router'
import { UNIV3_ROUTER02_ABI } from '../../../abi/uniV3/uniV3Router02'
import { Token } from '../../../primitives/tokens/Token'
import { ClientManager } from '../../../utils/ClientManager'
import { Pool } from '../Pool'

type UniV3LikePool = Pool & {
	quoterAddress: Address
	is02Router: boolean
	fee: number
}

export async function getPriceFromSlot(
	this: UniV3LikePool,
	slotFunctionName: string,
	sqrtPriceX96Index: number,
): Promise<{ price: number; sqrtPriceX96: bigint }> {
	const client = ClientManager.getClient(this.chainId)

	const result = await client.readContract({
		address: this.address,
		abi: this.poolAbi,
		functionName: slotFunctionName,
	})

	const sqrtPriceX96 = (result as bigint[])[sqrtPriceX96Index]

	const price = sqrtPriceX96ToPrice.bind(this)(sqrtPriceX96)

	return { price, sqrtPriceX96 }
}

export function sqrtPriceX96ToPrice(this: Pool, sqrtPriceX96: bigint): number {
	const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96
	const price = sqrtPrice ** 2
	return price * 10 ** (this.token0.decimals - this.token1.decimals)
}

export function priceToSqrtPriceX96(this: Pool, price: number): bigint {
	const adjustedPrice =
		price / 10 ** (this.token0.decimals - this.token1.decimals)
	const sqrtPrice = Math.sqrt(adjustedPrice)
	return BigInt(Math.floor(sqrtPrice * 2 ** 96))
}

export async function quoteSwapUniV3(
	this: UniV3LikePool,
	params: SwapParams,
): Promise<bigint> {
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

export async function simulateSwapUniV3(
	this: UniV3LikePool,
	params: SwapParams,
): Promise<{ amountOut: bigint; request: SimulateRequestWithAccount }> {
	const abi: Abi = this.is02Router ? UNIV3_ROUTER02_ABI : UNIV3_ROUTER_ABI

	const { amountOut: amountOutExpected } = await this.quoteSwap(params)

	const amountOutMinimum = this.calcMinAmountOut(
		amountOutExpected,
		params.slippage ?? this.DEFAULT_SLIPPAGE,
	)

	const args = [
		{
			tokenIn: params.tokenIn.address,
			tokenOut: params.tokenOut.address,
			fee: this.fee,
			recipient: this.account.address,
			deadline: this.is02Router ? undefined : this.calcDeadline(60 * 5),
			amountIn: params.amountIn,
			amountOutMinimum,
			sqrtPriceLimitX96: 0n,
		},
	]

	const { result: amountOut, request } = await this.client.simulateContract({
		address: this.routerAddress,
		abi,
		functionName: 'exactInputSingle',
		account: this.account,
		args,
	})

	return {
		amountOut,
		request: request as unknown as SimulateRequestWithAccount,
	}
}

export function defineAmountsFromEventUniV3(
	this: UniV3LikePool,
	swapEvent: DecodeEventLogReturnType<typeof UNIV3_POOL_SWAP_EVENT_ABI>,
	tokenIn: Token,
	tokenOut: Token,
): { amountOut: bigint; amountIn: bigint } {
	const zeroForOne = this.zeroForOne(tokenIn, tokenOut)

	const { amount0, amount1 } = swapEvent.args

	const [amountIn, amountOut] = zeroForOne
		? [amount0, -amount1]
		: [amount1, -amount0]

	return { amountOut, amountIn }
}
