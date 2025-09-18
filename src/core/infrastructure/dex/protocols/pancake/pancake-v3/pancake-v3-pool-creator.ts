import { Injectable } from '@nestjs/common'
import { getAddress } from 'viem'
import {
	callFactoryFunction,
	callFeeFunction,
	callToken0Function,
	callToken1Function,
	isRouterAndQuoterFactoryMatch,
} from '../../../base/bricks/common-bricks'
import { PoolConstructorParams } from '../../../base/pool'
import { PoolCreator } from '../../../base/pool-creator'
import { PANCAKE_V3_PERIPHERY } from './pancake-v3-periphery'
import { PancakeV3Pool } from './pancake-v3-pool'

@Injectable()
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
		const client = this.chainClientService.getClient(chainId)

		const fee = await callFeeFunction(poolAddress, client)

		return new PancakeV3Pool(
			{
				chainClientService: this.chainClientService,
				immutables,
				poolAddress,
				chainId,
				routerAddress: periphery.router,
			},
			fee,
			periphery.quoter,
		)
	}
}
