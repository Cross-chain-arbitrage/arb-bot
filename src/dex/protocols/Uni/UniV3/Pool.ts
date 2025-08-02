import { UNIV3_POOL_ABI } from '../../../../abi/uniV3/uniV3Pool'
import { isEventNameEqualSwap } from '../../../base/bricks/commonBricks'
import {
	defineAmountsFromEventUniV3,
	getPriceFromSlot,
	quoteSwapUniV3,
	RouterType,
	simulateSwapUniV3,
} from '../../../base/bricks/uniV3Bricks'
import { Pool, PoolConstructorParams } from '../../../base/Pool'

export class UniV3Pool extends Pool {
	public readonly fee: number
	public readonly quoterAddress: Address
	public readonly routerType: RouterType

	constructor(
		params: Omit<PoolConstructorParams, 'poolAbi'>,
		fee: number,
		quoterAddress: Address,
		routerType: RouterType,
	) {
		super({
			...params,
			poolAbi: UNIV3_POOL_ABI,
		})

		this.fee = fee
		this.quoterAddress = quoterAddress
		this.routerType = routerType
	}

	override async getPrice(): Promise<{
		price: number
		sqrtPriceX96: bigint
	}> {
		return getPriceFromSlot.bind(this)('slot0', 0)
	}

	override _quoteSwap = quoteSwapUniV3
	override _simulateSwap = simulateSwapUniV3
	override _isSwapEvent = isEventNameEqualSwap
	override _defineAmountsFromEvent = defineAmountsFromEventUniV3
}
