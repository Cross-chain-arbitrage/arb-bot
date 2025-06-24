import { Address } from 'viem'
import { Token } from '../../primitives/tokens/Token'
import { UniV2LikePool } from '../base/UniV2LikePool/UniV2LikePool'
import { PoolType } from '../poolVariety'

export class UniV2Pool extends UniV2LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		token0: Token,
		token1: Token,
		periphery: UniV2PoolPeriphery,
	) {
		const fee = UniV2Pool.getV2DefaultFee(PoolType.UNIV2)

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
		const { periphery, tokens } = await this.getPeripheryAndImmutables(
			poolAddress,
			chainId,
			PoolType.UNIV2,
		)

		return new UniV2Pool(
			poolAddress,
			chainId,
			tokens.token0,
			tokens.token1,
			periphery,
		)
	}
}
