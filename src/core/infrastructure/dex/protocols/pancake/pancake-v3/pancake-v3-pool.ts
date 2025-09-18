import { PANCAKE_V3_POOL_ABI } from '../../../../evm/abi/pancakeV3/pancakeV3Pool'
import { isEventNameEqualSwap } from '../../../base/bricks/common-bricks'
import {
	defineAmountsFromEventUniV3,
	getPriceFromSlot,
	quoteSwapUniV3,
	simulateSwapUniV3RouterV1,
} from '../../../base/bricks/uni-v3-bricks'
import { Pool, PoolConstructorParams } from '../../../base/pool'

export class PancakeV3Pool extends Pool {
	public readonly fee: number
	public readonly quoterAddress: Address

	constructor(
		params: Omit<PoolConstructorParams, 'poolAbi'>,
		fee: number,
		quoterAddress: Address,
	) {
		super({
			...params,
			poolAbi: PANCAKE_V3_POOL_ABI,
		})

		this.fee = fee
		this.quoterAddress = quoterAddress
	}

	override async getPrice(): Promise<{
		price: number
		sqrtPriceX96: bigint
	}> {
		return getPriceFromSlot.bind(this)('slot0', 0)
	}

	override _quoteSwap = quoteSwapUniV3
	override _simulateSwap = simulateSwapUniV3RouterV1
	override _isSwapEvent = isEventNameEqualSwap
	override _defineAmountsFromEvent = defineAmountsFromEventUniV3
}
