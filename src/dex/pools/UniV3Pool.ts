import { Address } from 'viem'
import { UNIV3_ROUTER_ABI } from '../../abi/uniV3/uniV3Router'
import { UniV3LikePool } from '../base/UniV3LikePool/UniV3LikePool'
import { PoolType } from '../poolVariety'

export class UniV3Pool extends UniV3LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
		periphery: PoolPeriphery,
	) {
		super(poolAddress, chainId, immutables, periphery, PoolType.UNIV3)
	}

	static async create(poolAddress: Address, chainId: number) {
		const { immutables, periphery } = await this.getPeripheryAndImmutables(
			poolAddress,
			chainId,
			PoolType.UNIV3,
		)

		return new UniV3Pool(poolAddress, chainId, immutables, periphery)
	}

	async simulateSwap(params: SwapParams) {
		await this.validateSwapParams(params)

		const args = await this.getSwapArguments(params)

		const { result: amountOut, request } =
			await this.client.simulateContract({
				address: this.routerAddress,
				abi: UNIV3_ROUTER_ABI,
				functionName: 'exactInputSingle',
				account: this.account,
				args: [args],
			})

		return {
			amountOut,
			request: request as unknown as SimulateRequestWithAccount,
		}
	}
}
