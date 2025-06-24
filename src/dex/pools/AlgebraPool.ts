import {
	Address,
	decodeEventLog,
	isAddressEqual,
	TransactionReceipt,
	zeroAddress,
} from 'viem'
import { ALGEBRA_POOL_ABI } from '../../abi/algebra/algebraPool'
import { ALGEBRA_QUOTER_ABI } from '../../abi/algebra/algebraQuoter'
import { ALGEBRA_ROUTER_ABI } from '../../abi/algebra/algebraRouter'
import {
	getV3PoolImmutables,
	validateAndGetPeriphery,
} from '../base/poolCreationHelpers'
import { UniV3LikePool } from '../base/UniV3LikePool'
import { PoolType } from '../poolVariety'

export class AlgebraPoolError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, AlgebraPoolError.prototype)
		this.name = 'AlgebraPoolError'
	}
}

export class AlgebraPool extends UniV3LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
	) {
		const periphery = validateAndGetPeriphery(
			chainId,
			PoolType.ALGEBRA,
		) as PoolPeriphery

		super(poolAddress, chainId, immutables, periphery, PoolType.ALGEBRA)
	}

	static async create(poolAddress: Address, chainId: number) {
		const immutables = await getV3PoolImmutables(
			poolAddress,
			chainId,
			PoolType.ALGEBRA,
		)

		return new AlgebraPool(poolAddress, chainId, immutables)
	}

	async getSwapArguments(params: SwapParams) {
		const { amountOut } = await this.quoteSwap(params)

		const amountOutMinimum = this.calcMinAmountOut(
			amountOut,
			params.slippage ?? this.defaultSlippage,
		)

		return {
			tokenIn: params.tokenIn.address,
			tokenOut: params.tokenOut.address,
			deployer: zeroAddress,
			recipient: this.account.address,
			deadline: this.calcDeadline(60 * 5),
			amountIn: params.amountIn,
			amountOutMinimum,
			limitSqrtPrice: 0n, // amountOutMinimum is enough for ensuring slippage
		}
	}

	async quoteSwap(params: SwapParams) {
		this.validateMismatchSwapParams(params)

		const { result } = await this.client.simulateContract({
			address: this.quoterAddress,
			abi: ALGEBRA_QUOTER_ABI,
			functionName: 'quoteExactInputSingle',
			account: this.account.address,
			args: [
				params.tokenIn.address,
				params.tokenOut.address,
				zeroAddress, //deployer
				params.amountIn,
				0n, //sqrtMaxLimit
			],
		})

		return { amountOut: result[0], fee: result[1] }
	}

	async simulateSwap(params: SwapParams) {
		await this.validateSwapParams(params)

		const args = await this.getSwapArguments(params)

		const { result: amountOut, request } =
			await this.client.simulateContract({
				address: this.routerAddress,
				abi: ALGEBRA_ROUTER_ABI,
				functionName: 'exactInputSingle',
				account: this.account.address,
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
					abi: ALGEBRA_POOL_ABI,
					data: log.data,
					topics: log.topics,
				})

				return event
			})
			.find((event) => event?.eventName === 'Swap')

		if (!swapEvent) throw new AlgebraPoolError('Swap event not found')

		const amountOut =
			swapEvent.args.amount0 < 0n
				? -swapEvent.args.amount0
				: -swapEvent.args.amount1

		return amountOut
	}
}
