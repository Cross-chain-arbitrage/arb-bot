import { Address } from 'viem'
import { Token } from '../../primitives/tokens/Token'
import { UniV2LikePool } from '../base/UniV2LikePool'
import {
	getV2DefaultFee,
	getV2PoolTokens,
	validateAndGetPeriphery,
} from '../base/poolCreationHelpers'
import { PoolType } from '../poolVariety'

export class UniV2Pool extends UniV2LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		token0: Token,
		token1: Token,
	) {
		const periphery = validateAndGetPeriphery(
			chainId,
			PoolType.UNIV2,
		) as UniV2PoolPeriphery

		const fee = getV2DefaultFee(PoolType.UNIV2)

		super(
			token0,
			token1,
			poolAddress,
			periphery.router,
			chainId,
			fee,
			PoolType.UNIV2,
		)
	}

	static async create(poolAddress: Address, chainId: number) {
		const [token0, token1] = await getV2PoolTokens(
			poolAddress,
			chainId,
			PoolType.UNIV2,
		)

		return new UniV2Pool(poolAddress, chainId, token0, token1)
	}
}
