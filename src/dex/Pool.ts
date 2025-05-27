import { BaseContract } from '../utils/contracts/BaseContract'
import { Token } from '../utils/tokens/Token'

export class Pool extends BaseContract {
	constructor(
		public readonly token0: Token,
		public readonly token1: Token,
		poolAddress: Address,
		chainId: number,
	) {
		super(poolAddress, chainId)
	}
}
