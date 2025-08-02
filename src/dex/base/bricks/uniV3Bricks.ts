import { DecodeEventLogReturnType, toHex } from 'viem'
import { UNI_UNIVERSAL_ROUTER_ABI } from '../../../abi/uni-universal-router'
import { UNIV3_POOL_SWAP_EVENT_ABI } from '../../../abi/uniV3/uniV3Pool'
import { UNIV3_QUOTER_ABI } from '../../../abi/uniV3/uniV3Quoter'
import { UNIV3_ROUTER_ABI } from '../../../abi/uniV3/uniV3Router'
import { UNIV3_ROUTER02_ABI } from '../../../abi/uniV3/uniV3Router02'
import { Token } from '../../../primitives/tokens/Token'
import { Pool } from '../Pool'
import { CommandType, RoutePlanner } from './uni-universal-router-planner'

export async function getPriceFromSlot(
	this: Pool,
	slotFunctionName: string,
	sqrtPriceX96Index: number,
): Promise<{ price: number; sqrtPriceX96: bigint }> {
	const client = this.chainClientService.getClient(this.chainId)

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
	this: Pool & {
		quoterAddress: Address
		fee: number
	},
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

export function defineAmountsFromEventUniV3(
	this: Pool,
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

export enum RouterType {
	V1 = 'v1',
	V2 = 'v2',
	UNIVERSAL = 'universal',
}
export async function simulateSwapUniV3(
	this: Pool & {
		routerAddress: Address
		fee: number
		routerType: RouterType
	},
	params: SwapParams,
): Promise<{ amountOut: bigint; request: SimulateRequestWithAccount }> {
	const { amountOut: amountOutExpected } = await this.quoteSwap(params)
	const amountOutMinimum = this.calcMinAmountOut(
		amountOutExpected,
		params.slippage ?? this.DEFAULT_SLIPPAGE,
	)

	switch (this.routerType) {
		case RouterType.V1:
			return simulateSwapRouterV1.bind(this)(params, amountOutMinimum)
		case RouterType.V2:
			return simulateSwapRouterV2.bind(this)(params, amountOutMinimum)
		case RouterType.UNIVERSAL:
			return simulateSwapRouterUniversal.bind(this)(
				params,
				amountOutMinimum,
				amountOutExpected,
			)
	}
}

async function simulateSwapRouterV1(
	this: Pool & { routerAddress: Address; fee: number },
	params: SwapParams,
	amountOutMinimum: bigint,
): Promise<{ amountOut: bigint; request: SimulateRequestWithAccount }> {
	const args = [
		{
			tokenIn: params.tokenIn.address,
			tokenOut: params.tokenOut.address,
			fee: this.fee,
			recipient: this.account.address,
			deadline: this.calcDeadline(60 * 5),
			amountIn: params.amountIn,
			amountOutMinimum,
			sqrtPriceLimitX96: 0n,
		},
	] as const

	const { result: amountOut, request } = await this.client.simulateContract({
		address: this.routerAddress,
		abi: UNIV3_ROUTER_ABI,
		functionName: 'exactInputSingle',
		account: this.account,
		args,
	})

	return {
		amountOut,
		request: request as unknown as SimulateRequestWithAccount,
	}
}

async function simulateSwapRouterV2(
	this: Pool & { routerAddress: Address; fee: number },
	params: SwapParams,
	amountOutMinimum: bigint,
): Promise<{ amountOut: bigint; request: SimulateRequestWithAccount }> {
	const args = [
		{
			tokenIn: params.tokenIn.address,
			tokenOut: params.tokenOut.address,
			fee: this.fee,
			recipient: this.account.address,
			amountIn: params.amountIn,
			amountOutMinimum,
			sqrtPriceLimitX96: 0n,
		},
	] as const

	const { result: amountOut, request } = await this.client.simulateContract({
		address: this.routerAddress,
		abi: UNIV3_ROUTER02_ABI,
		functionName: 'exactInputSingle',
		account: this.account,
		args,
	})

	return {
		amountOut,
		request: request as unknown as SimulateRequestWithAccount,
	}
}

async function simulateSwapRouterUniversal(
	this: Pool & { routerAddress: Address; fee: number },
	params: SwapParams,
	amountOutMinimum: bigint,
	amountOutExpected: bigint,
): Promise<{ amountOut: bigint; request: SimulateRequestWithAccount }> {
	const planner = new RoutePlanner()

	planner.addCommand(CommandType.V3_SWAP_EXACT_IN, {
		recipient: this.account.address,
		amountIn: params.amountIn,
		amountOutMinimum,
		path: buildPath.bind(this)(params.tokenIn, params.tokenOut),
		payerIsUser: true,
	})

	const { request } = await this.client.simulateContract({
		address: this.routerAddress,
		abi: UNI_UNIVERSAL_ROUTER_ABI,
		functionName: 'execute',
		account: this.account.address,
		args: [planner.commands, planner.inputs],
	})

	return {
		amountOut: amountOutExpected,
		request: request as unknown as SimulateRequestWithAccount,
	}
}

function buildPath(
	this: Pool & { fee: number },
	tokenIn: Token,
	tokenOut: Token,
): Bytes {
	let path = '0x'

	path += tokenIn.address.slice(2)
	path += toHex(this.fee, { size: 3 }).slice(2)
	path += tokenOut.address.slice(2)

	return path as Bytes
}
