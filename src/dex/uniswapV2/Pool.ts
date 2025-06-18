import { Address } from 'viem'
import { UNIV2_POOL_ABI } from '../../abi/uniV2/pool'
import { Token } from '../../primitives/tokens/Token'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../utils/ClientManager'
import { UniV2LikePool } from '../UniV2LikePool'
import { peripheryAddresses } from './data'

export class UniV2PoolError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, UniV2PoolError.prototype)
		this.name = 'UniV2PoolError'
	}
}

export class UniV2Pool extends UniV2LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		token0: Token,
		token1: Token,
	) {
		const periphery = peripheryAddresses[chainId]

		if (!periphery)
			throw new UniV2PoolError(`No periphery found for chain ${chainId}`)

		super(token0, token1, poolAddress, periphery.router, chainId, 30)
	}

	static async create(poolAddress: Address, chainId: number) {
		const client = ClientManager.getClient(chainId)

		const [token0Addr, token1Addr] = await Promise.all([
			client.readContract({
				address: poolAddress,
				abi: UNIV2_POOL_ABI,
				functionName: 'token0',
			}),
			client.readContract({
				address: poolAddress,
				abi: UNIV2_POOL_ABI,
				functionName: 'token1',
			}),
		])

		const [token0, token1] = await Promise.all([
			TokenUtils.fromAddress<Token>(token0Addr, chainId),
			TokenUtils.fromAddress<Token>(token1Addr, chainId),
		])

		return new UniV2Pool(poolAddress, chainId, token0, token1)
	}
}
