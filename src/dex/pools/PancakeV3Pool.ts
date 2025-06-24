import { Address } from 'viem'
import { UNIV3_ROUTER_ABI } from '../../abi/uniV3/uniV3Router'
import { UniV3LikePool } from '../base/UniV3LikePool'
import {
	getV3PoolImmutables,
	validateAndGetPeriphery,
} from '../base/poolCreationHelpers'
import { PoolType } from '../poolVariety'

export class PancakeV3Pool extends UniV3LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
	) {
		const periphery = validateAndGetPeriphery(
			chainId,
			PoolType.PANCAKEV3,
		) as PoolPeriphery

		super(poolAddress, chainId, immutables, periphery, PoolType.PANCAKEV3)
	}

	static async create(poolAddress: Address, chainId: number) {
		const immutables = await getV3PoolImmutables(
			poolAddress,
			chainId,
			PoolType.PANCAKEV3,
		)

		return new PancakeV3Pool(poolAddress, chainId, immutables)
	}

	async simulateSwap(params: SwapParams) {
		await this.validateSwapParams(params)

		const args = await this.getSwapArguments(params)

		const { result: amountOut, request } =
			await this.client.simulateContract({
				address: this.routerAddress,
				abi: UNIV3_ROUTER_ABI,
				functionName: 'exactInputSingle',
				account: this.account.address,
				args: [args],
			})

		return {
			amountOut,
			request: request as unknown as SimulateRequestWithAccount,
		}
	}
}
