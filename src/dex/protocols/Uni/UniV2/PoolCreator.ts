import { Injectable } from '@nestjs/common'
import { getAddress } from 'viem'
import {
	callFactoryFunction,
	callToken0Function,
	callToken1Function,
	isRouterFactoryMatch,
} from '../../../base/bricks/commonBricks'
import { PoolConstructorParams } from '../../../base/Pool'
import { PoolCreator } from '../../../base/PoolCreator'
import { UNIV2_PERIPHERY_CONFIG } from './periphery'
import { UniV2Pool } from './Pool'

@Injectable()
export class UniV2PoolCreator extends PoolCreator {
	override _getToken0Address = callToken0Function
	override _getToken1Address = callToken1Function
	override _getPoolFactoryAddress = callFactoryFunction
	override _isPeripheryValid = isRouterFactoryMatch

	override _getPeripheryFromCollection(
		chainId: number,
		poolFactory: Address,
	) {
		return UNIV2_PERIPHERY_CONFIG[chainId]?.[getAddress(poolFactory)]
	}

	override _create(
		poolAddress: Address,
		chainId: number,
		periphery: { router: Address },
		immutables: PoolConstructorParams['immutables'],
	) {
		const pool = new UniV2Pool({
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
