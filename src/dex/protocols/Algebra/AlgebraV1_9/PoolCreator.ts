import { getAddress } from 'viem'
import {
	callFactoryFunction,
	callToken0Function,
	callToken1Function,
	isRouterAndQuoterFactoryMatch,
} from '../../../base/bricks/commonBricks'
import { PoolConstructorParams } from '../../../base/Pool'
import { PoolCreator } from '../../../base/PoolCreator'
import { ALGEBRA_V1_9_PERIPHERY } from './periphery'
import { AlgebraV1_9Pool } from './Pool'

export class AlgebraV1_9PoolCreator extends PoolCreator {
	override _getToken0Address = callToken0Function
	override _getToken1Address = callToken1Function
	override _getPoolFactoryAddress = callFactoryFunction
	override _isPeripheryValid = isRouterAndQuoterFactoryMatch

	override _getPeripheryFromCollection(
		chainId: number,
		poolFactory: Address,
	) {
		return ALGEBRA_V1_9_PERIPHERY[chainId]?.[getAddress(poolFactory)]
	}

	override async _create(
		poolAddress: Address,
		chainId: number,
		periphery: (typeof ALGEBRA_V1_9_PERIPHERY)[number][Address],
		immutables: PoolConstructorParams['immutables'],
	) {
		const pool = new AlgebraV1_9Pool(
			{
				immutables,
				poolAddress,
				chainId,
				routerAddress: periphery.router,
			},
			periphery.quoter,
		)

		return Promise.resolve(pool)
	}
}
