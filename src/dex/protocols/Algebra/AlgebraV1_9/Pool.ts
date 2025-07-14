import { zeroAddress } from 'viem'
import { ALGEBRA_V1_9_POOL_ABI } from '../../../../abi/algebraV1_9/algebraV1_9Pool'
import { ALGEBRA_V1_9_QUOTER_ABI } from '../../../../abi/algebraV1_9/algebraV1_9Quoter'
import { ALGEBRA_V1_9_ROUTER_ABI } from '../../../../abi/algebraV1_9/algebraV1_9Router'
import { isEventNameEqualSwap } from '../../../base/bricks/commonBricks'
import {
	defineAmountsFromEventUniV3,
	getPriceFromSlot,
} from '../../../base/bricks/uniV3Bricks'
import { Pool, PoolConstructorParams } from '../../../base/Pool'

export class AlgebraV1_9Pool extends Pool {
	constructor(
		params: Omit<PoolConstructorParams, 'poolAbi'>,
		readonly quoterAddress: Address,
	) {
		super({
			...params,
			poolAbi: ALGEBRA_V1_9_POOL_ABI,
		})
	}

	override async getPrice(): Promise<{
		price: number
		sqrtPriceX96: bigint
	}> {
		return getPriceFromSlot.bind(this)('globalState', 0)
	}

	override _isSwapEvent = isEventNameEqualSwap
	override _defineAmountsFromEvent = defineAmountsFromEventUniV3

	override async _quoteSwap(params: SwapParams) {
		const { result } = await this.client.simulateContract({
			address: this.quoterAddress,
			abi: ALGEBRA_V1_9_QUOTER_ABI,
			functionName: 'quoteExactInputSingle',
			account: this.account.address,
			args: [
				params.tokenIn.address,
				params.tokenOut.address,
				params.amountIn,
				0n, //sqrtMaxLimit
			],
		})

		return result[0]
	}

	async _simulateSwap(params: SwapParams) {
		const { amountOut: amountOutExpected } = await this.quoteSwap(params)

		const amountOutMinimum = this.calcMinAmountOut(
			amountOutExpected,
			params.slippage ?? this.DEFAULT_SLIPPAGE,
		)

		const args = {
			tokenIn: params.tokenIn.address,
			tokenOut: params.tokenOut.address,
			deployer: zeroAddress,
			recipient: this.account.address,
			deadline: this.calcDeadline(60 * 5),
			amountIn: params.amountIn,
			amountOutMinimum,
			limitSqrtPrice: 0n, // amountOutMinimum is enough for ensuring slippage
			sdf: 0n,
		}

		const { result: amountOut, request } =
			await this.client.simulateContract({
				address: this.routerAddress,
				abi: ALGEBRA_V1_9_ROUTER_ABI,
				functionName: 'exactInputSingle',
				account: this.account.address,
				args: [args],
			})

		return {
			amountOut,
			request: request as unknown as SimulateRequestWithAccount,
		}
	}
}
