import { zeroAddress } from 'viem'
import { ALGEBRA_V1_2_POOL_ABI } from '../../abi/algebraV1_2/pool'
import { ALGEBRA_V1_2_QUOTER_ABI } from '../../abi/algebraV1_2/quoter'
import { ALGEBRA_V1_2_ROUTER_ABI } from '../../abi/algebraV1_2/router'
import { isEventNameEqualSwap } from '../base/bricks/commonBricks'
import {
	defineAmountsFromEventUniV3,
	getPriceFromSlot,
} from '../base/bricks/uniV3Bricks'
import { Pool, PoolConstructorParams } from '../base/Pool'

export class AlgebraV1_2Pool extends Pool {
	public readonly fee: number
	public readonly quoterAddress: Address

	constructor(
		params: Omit<PoolConstructorParams, 'poolAbi'>,
		fee: number,
		quoterAddress: Address,
	) {
		super({
			...params,
			poolAbi: ALGEBRA_V1_2_POOL_ABI,
		})

		this.fee = fee
		this.quoterAddress = quoterAddress
	}

	override async getPrice(): Promise<{ price: number } & object> {
		return getPriceFromSlot.bind(this)('globalState', 0)
	}

	override async _quoteSwap(params: SwapParams): Promise<bigint> {
		const { result } = await this.client.simulateContract({
			address: this.quoterAddress,
			abi: ALGEBRA_V1_2_QUOTER_ABI,
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

		return result[0]
	}

	override async _simulateSwap(
		params: SwapParams,
	): Promise<{ amountOut: bigint; request: SimulateRequestWithAccount }> {
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
		}

		const { result: amountOut, request } =
			await this.client.simulateContract({
				address: this.routerAddress,
				abi: ALGEBRA_V1_2_ROUTER_ABI,
				functionName: 'exactInputSingle',
				account: this.account.address,
				args: [args],
			})

		return {
			amountOut,
			request: request as unknown as SimulateRequestWithAccount,
		}
	}

	override _isSwapEvent = isEventNameEqualSwap
	override _defineAmountsFromEvent = defineAmountsFromEventUniV3
}
