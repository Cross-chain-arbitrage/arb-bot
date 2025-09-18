import { Injectable } from '@nestjs/common'
import { getAddress, PublicClient } from 'viem'
import { VELODROME_V1_POOL_ABI } from '../../../../evm/abi/velodrome/velodromeV1Pool'
import {
	callFactoryFunction,
	callToken0Function,
	callToken1Function,
	isContractFactoryMatch,
} from '../../../base/bricks/common-bricks'
import { PoolConstructorParams } from '../../../base/pool'
import { PoolCreator } from '../../../base/pool-creator'
import { VELODROME_V1_PERIPHERY } from './velodrome-v1-periphery'
import { VelodromeV1Pool } from './velodrome-v1-pool'

@Injectable()
export class VelodromeV1PoolCreator extends PoolCreator {
	override _getToken0Address = callToken0Function
	override _getToken1Address = callToken1Function
	override _getPoolFactoryAddress = callFactoryFunction

	override async _isPeripheryValid(
		periphery: { router: Address; quoter: Address },
		poolFactory: Address,
		client: PublicClient,
	): Promise<boolean> {
		const [isRouterMatch, isQuoterMatch] = await Promise.all([
			isContractFactoryMatch(
				periphery.router,
				poolFactory,
				client,
				'VELODROME_CL_FACTORY',
			),
			isContractFactoryMatch(periphery.quoter, poolFactory, client),
		])

		return isRouterMatch && isQuoterMatch
	}

	override _getPeripheryFromCollection(
		chainId: number,
		poolFactory: Address,
	) {
		return VELODROME_V1_PERIPHERY[chainId]?.[getAddress(poolFactory)]
	}

	override async _create(
		poolAddress: Address,
		chainId: number,
		periphery: (typeof VELODROME_V1_PERIPHERY)[number][Address],
		immutables: PoolConstructorParams['immutables'],
	) {
		const client = this.chainClientService.getClient(chainId)

		const tickSpacing = await client.readContract({
			address: poolAddress,
			abi: VELODROME_V1_POOL_ABI,
			functionName: 'tickSpacing',
		})

		return new VelodromeV1Pool(
			{
				chainClientService: this.chainClientService,
				immutables,
				poolAddress,
				chainId,
				routerAddress: periphery.router,
			},
			periphery.quoter,
			tickSpacing,
		)
	}
}
