import { UNIV3_POOL_ABI } from '../../abi/uniV3/uniV3Pool'
import { isEventNameEqualSwap } from '../base/bricks/commonBricks'
import {
	defineAmountsFromEventUniV3,
	getPriceFromSlot,
	quoteSwapUniV3,
	simulateSwapUniV3,
} from '../base/bricks/uniV3Bricks'
import { Pool, PoolConstructorParams } from '../base/Pool'

export class UniV3Pool extends Pool {
	public readonly fee: number
	public readonly quoterAddress: Address
	public readonly is02Router: boolean

	constructor(
		params: Omit<PoolConstructorParams, 'poolAbi'>,
		fee: number,
		quoterAddress: Address,
		is02Router: boolean,
	) {
		super({
			...params,
			poolAbi: UNIV3_POOL_ABI,
		})

		this.fee = fee
		this.quoterAddress = quoterAddress
		this.is02Router = is02Router
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
