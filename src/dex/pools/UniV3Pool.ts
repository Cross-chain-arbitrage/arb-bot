import {
	Address,
	decodeEventLog,
	isAddressEqual,
	TransactionReceipt,
} from 'viem'
import { UNIV3_POOL_ABI } from '../../abi/uniV3/uniV3Pool'
import { UNIV3_QUOTER_ABI } from '../../abi/uniV3/uniV3Quoter'
import { UNIV3_ROUTER_ABI } from '../../abi/uniV3/uniV3Router'
import { UniV3LikePool } from '../base/UniV3LikePool'
import {
	getV3PoolImmutables,
	validateAndGetPeriphery,
} from '../base/poolCreationHelpers'
import { PoolType } from '../poolVariety'

export class UniV3PoolError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, UniV3PoolError.prototype)
		this.name = 'UniV3PoolError'
	}
}

export class UniV3Pool extends UniV3LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
	) {
		const periphery = validateAndGetPeriphery(
			chainId,
			PoolType.UNIV3,
		) as PoolPeriphery

		super(poolAddress, chainId, immutables, periphery, PoolType.UNIV3)
	}

	static async create(poolAddress: Address, chainId: number) {
		const immutables = await getV3PoolImmutables(
			poolAddress,
			chainId,
			PoolType.UNIV3,
		)

		return new UniV3Pool(poolAddress, chainId, immutables)
	}

	async getPrices(): Promise<{ price: number; sqrtPriceX96: bigint }> {
		const address = this.address

		const [sqrtPriceX96] = await this.client.readContract({
			address,
			abi: UNIV3_POOL_ABI,
			functionName: 'slot0',
		})

		// Calculate price
		const price = this.sqrtPriceX96ToPrice(sqrtPriceX96)

		return { price, sqrtPriceX96 }
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

		const args: UniV3SwapArgs = {
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

	async simulateSwap(params: SwapParams) {
		await this.validateSwapParams(params)

		const args = await this.getSwapArguments(params)

		const { result: amountOut, request } =
			await this.client.simulateContract({
				address: this.routerAddress,
				abi: UNIV3_ROUTER_ABI,
				functionName: 'exactInputSingle',
				account: this.account,
				args: [args],
			})

		return {
			amountOut,
			request: request as unknown as SimulateRequestWithAccount,
		}
	}

	parseAmountOut(swapReceipt: TransactionReceipt): bigint {
		const swapEvent = swapReceipt.logs
			.map((log) => {
				if (!isAddressEqual(log.address, this.address)) return null

				const event = decodeEventLog({
					abi: UNIV3_POOL_ABI,
					data: log.data,
					topics: log.topics,
				})

				return event
			})
			.find((event) => event?.eventName === 'Swap')

		if (!swapEvent) throw new UniV3PoolError('Swap event not found')

		const amountOut =
			swapEvent.args.amount0 < 0n
				? -swapEvent.args.amount0
				: -swapEvent.args.amount1

		return amountOut
	}
}
