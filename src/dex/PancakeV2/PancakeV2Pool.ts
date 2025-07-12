import { Address } from 'viem'
import { Token } from '../../primitives/tokens/Token'
import { UniV2LikePool } from '../base/uniV2Bricks/UniV2LikePool'
import { PoolType } from '../poolVariety'

export class PancakeV2Pool extends UniV2LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		token0: Token,
		token1: Token,
		periphery: UniV2PoolPeriphery,
		factory: Address,
	) {
		const fee = PancakeV2Pool.getV2DefaultFee(PoolType.PANCAKEV2)

		super(
			token0,
			token1,
			poolAddress,
			periphery.router,
			chainId,
			fee,
			PoolType.PANCAKEV2,
			factory,
		)
	}

	static async create(poolAddress: Address, chainId: number) {
		const { periphery, tokens, factory } =
			await this.getPeripheryAndImmutables(
				poolAddress,
				chainId,
				PoolType.PANCAKEV2,
			)

		return new PancakeV2Pool(
			poolAddress,
			chainId,
			tokens.token0,
			tokens.token1,
			periphery,
			factory,
		)
	}
}
