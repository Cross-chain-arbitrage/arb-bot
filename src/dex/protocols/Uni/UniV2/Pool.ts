import { UNIV2_POOL_ABI } from '../../../../abi/uniV2/pool'
import { isEventNameEqualSwap } from '../../../base/bricks/commonBricks'
import {
	defineAmountsFromEventUniV2,
	getPriceUniV2,
	quoteSwapUniV2,
	simulateSwapUniV2,
} from '../../../base/bricks/uniV2Bricks'
import { Pool, PoolConstructorParams } from '../../../base/Pool'

export class UniV2Pool extends Pool {
	readonly fee: number = 30

	constructor(params: Omit<PoolConstructorParams, 'poolAbi'>) {
		super({
			...params,
			poolAbi: UNIV2_POOL_ABI,
		})
	}

	override getPrice = getPriceUniV2
	override _quoteSwap = quoteSwapUniV2
	override _simulateSwap = simulateSwapUniV2
	override _isSwapEvent = isEventNameEqualSwap
	override _defineAmountsFromEvent = defineAmountsFromEventUniV2
}
