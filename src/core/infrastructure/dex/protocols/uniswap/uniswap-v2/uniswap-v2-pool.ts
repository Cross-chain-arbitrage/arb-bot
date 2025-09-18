import { UNIV2_POOL_ABI } from '../../../../evm/abi/uniV2/pool'
import { isEventNameEqualSwap } from '../../../base/bricks/common-bricks'
import {
	defineAmountsFromEventUniV2,
	getPriceUniV2,
	quoteSwapUniV2,
	simulateSwapUniV2,
} from '../../../base/bricks/uni-v2-bricks'
import { Pool, PoolConstructorParams } from '../../../base/pool'

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
