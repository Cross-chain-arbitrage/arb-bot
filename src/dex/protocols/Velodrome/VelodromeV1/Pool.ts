import { toHex } from 'viem'
import { VELODROME_MIXED_QUOTER_ABI } from '../../../../abi/velodrome/velodromeMixedQuoter'
import { VELODROME_UNIVERSAL_ROUTER_ABI } from '../../../../abi/velodrome/velodromeUniversalRouter'
import { VELODROME_V1_POOL_ABI } from '../../../../abi/velodrome/velodromeV1Pool'
import { Token } from '../../../../primitives/tokens/Token'
import { isEventNameEqualSwap } from '../../../base/bricks/commonBricks'
import {
	defineAmountsFromEventUniV3,
	getPriceFromSlot,
} from '../../../base/bricks/uniV3Bricks'
import { Pool, PoolConstructorParams } from '../../../base/Pool'
import { CommandType, RoutePlanner } from '../velodromeUniversalRouterPlanner'

export class VelodromeV1Pool extends Pool {
	constructor(
		params: Omit<PoolConstructorParams, 'poolAbi'>,
		public readonly quoterAddress: Address,
		public readonly tickSpacing: number,
	) {
		super({
			...params,
			poolAbi: VELODROME_V1_POOL_ABI,
		})
	}

	override async getPrice(): Promise<{
		price: number
		sqrtPriceX96: bigint
	}> {
		return getPriceFromSlot.bind(this)('slot0', 0)
	}

	override _defineAmountsFromEvent = defineAmountsFromEventUniV3
	override _isSwapEvent = isEventNameEqualSwap

	protected async _simulateSwap(
		params: SwapParams,
	): Promise<{ amountOut: bigint; request: SimulateRequestWithAccount }> {
		const planner = new RoutePlanner()

		const { amountOut: amountOutExpected } = await this.quoteSwap(params)

		const amountOutMinimum = this.calcMinAmountOut(
			amountOutExpected,
			params.slippage ?? this.DEFAULT_SLIPPAGE,
		)

		planner.addCommand(CommandType.V3_SWAP_EXACT_IN, {
			recipient: this.account.address,
			amountIn: params.amountIn,
			amountOutMinimum,
			path: this.buildPath(params.tokenIn, params.tokenOut),
			payerIsUser: true,
			isUni: false,
		})

		const { request } = await this.client.simulateContract({
			address: this.routerAddress,
			abi: VELODROME_UNIVERSAL_ROUTER_ABI,
			functionName: 'execute',
			account: this.account.address,
			args: [planner.commands, planner.inputs],
		})

		return {
			amountOut: amountOutExpected,
			request: request as unknown as SimulateRequestWithAccount,
		}
	}

	buildPath(tokenIn: Token, tokenOut: Token): Bytes {
		let path = '0x'

		path += tokenIn.address.slice(2)
		path += toHex(this.tickSpacing, { size: 3 }).slice(2)
		path += tokenOut.address.slice(2)

		return path as Bytes
	}

	override async _quoteSwap(params: SwapParams) {
		const { result } = await this.client.simulateContract({
			address: this.quoterAddress,
			abi: VELODROME_MIXED_QUOTER_ABI,
			functionName: 'quoteExactInputSingleV3',
			account: this.account,
			args: [
				{
					tokenIn: params.tokenIn.address,
					tokenOut: params.tokenOut.address,
					amountIn: params.amountIn,
					tickSpacing: this.tickSpacing,
					sqrtPriceLimitX96: 0n,
				},
			],
		})

		return result[0]
	}
}
