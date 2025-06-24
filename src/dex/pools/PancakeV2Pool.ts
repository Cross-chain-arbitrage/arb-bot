import { Address } from 'viem'
import { Token } from '../../primitives/tokens/Token'
import { UniV2LikePool } from '../base/UniV2LikePool'
import {
	getV2DefaultFee,
	getV2PoolTokens,
	validateAndGetPeriphery,
} from '../base/poolCreationHelpers'
import { PoolType } from '../poolVariety'

export class PancakeV2Pool extends UniV2LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		token0: Token,
		token1: Token,
	) {
		const periphery = validateAndGetPeriphery(
			chainId,
			PoolType.PANCAKEV2,
		) as UniV2PoolPeriphery
		const fee = getV2DefaultFee(PoolType.PANCAKEV2)

		super(
			token0,
			token1,
			poolAddress,
			periphery.router,
			chainId,
			fee,
			PoolType.PANCAKEV2,
		)
	}

	static async create(poolAddress: Address, chainId: number) {
		const [token0, token1] = await getV2PoolTokens(
			poolAddress,
			chainId,
			PoolType.PANCAKEV2,
		)

		return new PancakeV2Pool(poolAddress, chainId, token0, token1)
	}
}
