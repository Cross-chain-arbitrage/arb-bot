import { getAddress } from 'viem'
import { ClientManager } from '../../utils/ClientManager'
import {
	callFactoryFunction,
	callFeeFunction,
	callToken0Function,
	callToken1Function,
	isRouterAndQuoterFactoryMatch,
} from '../base/bricks/commonBricks'
import { PoolConstructorParams } from '../base/Pool'
import { PoolCreator } from '../base/PoolCreator'
import { PANCAKE_V3_PERIPHERY } from './periphery'
import { PancakeV3Pool } from './Pool'

export class PancakeV3PoolCreator extends PoolCreator {
	override _getToken0Address = callToken0Function
	override _getToken1Address = callToken1Function
	override _getPoolFactoryAddress = callFactoryFunction
	override _isPeripheryValid = isRouterAndQuoterFactoryMatch

	override _getPeripheryFromCollection(
		chainId: number,
		poolFactory: Address,
	) {
		return PANCAKE_V3_PERIPHERY[chainId]?.[getAddress(poolFactory)]
	}

	override async _create(
		poolAddress: Address,
		chainId: number,
		periphery: (typeof PANCAKE_V3_PERIPHERY)[number][Address],
		immutables: PoolConstructorParams['immutables'],
	) {
		const client = ClientManager.getClient(chainId)

		const fee = await callFeeFunction(poolAddress, client)

		return new PancakeV3Pool(
			{
				immutables,
				poolAddress,
				chainId,
				routerAddress: periphery.router,
			},
			fee,
			periphery.quoter,
			periphery.is02Router,
		)
	}
}
