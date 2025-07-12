import { getAddress } from 'viem'
import { PoolConstructorParams } from '../base/Pool'
import { PoolCreator } from '../base/PoolCreator'
import {
	callFactoryFunction,
	callToken0Function,
	callToken1Function,
	isRouterFactoryMatch,
} from '../base/bricks/commonBricks'
import { PancakeV2Pool } from './Pool'
import { PANCAKE_V2_PERIPHERY } from './periphery'

export class PancakeV2PoolCreator extends PoolCreator {
	override _getToken0Address = callToken0Function
	override _getToken1Address = callToken1Function
	override _getPoolFactoryAddress = callFactoryFunction
	override _isPeripheryValid = isRouterFactoryMatch

	override _getPeripheryFromCollection(
		chainId: number,
		poolFactory: Address,
	) {
		return PANCAKE_V2_PERIPHERY[chainId]?.[getAddress(poolFactory)]
	}

	override _create(
		poolAddress: Address,
		chainId: number,
		periphery: { router: Address },
		immutables: PoolConstructorParams['immutables'],
	) {
		const pool = new PancakeV2Pool({
			immutables,
			poolAddress,
			chainId,
			routerAddress: periphery.router,
		})

		// abstract _create must return a promise
		return Promise.resolve(pool)
	}
}
