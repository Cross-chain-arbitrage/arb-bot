import { Injectable } from '@nestjs/common'
import { getAddress, PublicClient } from 'viem'
import {
	callFactoryFunction,
	callFeeFunction,
	callToken0Function,
	callToken1Function,
	isContractFactoryMatch,
	isRouterAndQuoterFactoryMatch,
} from '../../../base/bricks/common-bricks'
import { RouterType } from '../../../base/bricks/uni-v3-bricks'
import { PoolConstructorParams } from '../../../base/pool'
import { PoolCreator } from '../../../base/pool-creator'
import { UNIV3_PERIPHERY_CONFIG } from './uniswap-v3-periphery'
import { UniV3Pool } from './uniswap-v3-pool'

@Injectable()
export class UniV3PoolCreator extends PoolCreator {
	override _getToken0Address = callToken0Function
	override _getToken1Address = callToken1Function
	override _getPoolFactoryAddress = callFactoryFunction

	override async _isPeripheryValid(
		periphery: (typeof UNIV3_PERIPHERY_CONFIG)[number][Address],
		poolFactory: Address,
		client: PublicClient,
	) {
		switch (periphery.routerType) {
			case RouterType.V1:
			case RouterType.V2:
				return isRouterAndQuoterFactoryMatch(
					periphery,
					poolFactory,
					client,
				)
			case RouterType.UNIVERSAL:
				return isContractFactoryMatch(
					periphery.quoter,
					poolFactory,
					client,
				)
		}
	}

	override _getPeripheryFromCollection(
		chainId: number,
		poolFactory: Address,
	) {
		return UNIV3_PERIPHERY_CONFIG[chainId]?.[getAddress(poolFactory)]
	}

	override async _create(
		poolAddress: Address,
		chainId: number,
		periphery: (typeof UNIV3_PERIPHERY_CONFIG)[number][Address],
		immutables: PoolConstructorParams['immutables'],
	) {
		const client = this.chainClientService.getClient(chainId)

		const fee = await callFeeFunction(poolAddress, client)

		return new UniV3Pool(
			{
				chainClientService: this.chainClientService,
				immutables,
				poolAddress,
				chainId,
				routerAddress: periphery.router,
			},
			fee,
			periphery.quoter,
			periphery.routerType,
			periphery.routerType === RouterType.UNIVERSAL
				? periphery.permit2
				: undefined,
		)
	}
}
