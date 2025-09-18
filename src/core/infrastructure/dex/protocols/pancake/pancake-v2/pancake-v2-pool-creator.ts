import { Injectable } from '@nestjs/common'
import { getAddress } from 'viem'
import {
	callFactoryFunction,
	callToken0Function,
	callToken1Function,
	isRouterFactoryMatch,
} from '../../../base/bricks/common-bricks'
import { PoolConstructorParams } from '../../../base/pool'
import { PoolCreator } from '../../../base/pool-creator'
import { PANCAKE_V2_PERIPHERY } from './pancake-v2-periphery'
import { PancakeV2Pool } from './pancake-v2-pool'

@Injectable()
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
			chainClientService: this.chainClientService,
			immutables,
			poolAddress,
			chainId,
			routerAddress: periphery.router,
		})

		// abstract _create must return a promise
		return Promise.resolve(pool)
	}
}
