import { VELODROME_UNIVERSAL_ROUTER_ABI } from '../../abi/velodrome/velodromeUniversalRouter'
import { VELODROME_V2_POOL_ABI } from '../../abi/velodrome/velodromeV2Pool'
import { Token } from '../../primitives/tokens/Token'
import { isEventNameEqualSwap } from '../base/bricks/commonBricks'
import {
	defineAmountsFromEventUniV2,
	getPriceUniV2,
	quoteSwapUniV2,
} from '../base/bricks/uniV2Bricks'
import { Pool, PoolConstructorParams } from '../base/Pool'
import { CommandType, RoutePlanner } from '../velodromeUniversalRouterPlanner'

export class VelodromeV2Pool extends Pool {
	constructor(
		params: Omit<PoolConstructorParams, 'poolAbi'>,
		readonly isStable: boolean,
		readonly fee: number,
	) {
		super({
			...params,
			poolAbi: VELODROME_V2_POOL_ABI,
		})
	}

	getPrice = getPriceUniV2
	override _quoteSwap = quoteSwapUniV2
	override _isSwapEvent = isEventNameEqualSwap
	override _defineAmountsFromEvent = defineAmountsFromEventUniV2

	async _simulateSwap(params: SwapParams) {
		const planner = new RoutePlanner()

		const slippage = params.slippage ?? this.DEFAULT_SLIPPAGE

		const { amountOut: amountOutExpected } = await this.quoteSwap(params)

		const amountOutMinimum = this.calcMinAmountOut(
			amountOutExpected,
			slippage,
		)

		planner.addCommand(CommandType.V2_SWAP_EXACT_IN, {
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
		path += this.isStable ? '01' : '00'
		path += tokenOut.address.slice(2)

		return path as Bytes
	}
}
