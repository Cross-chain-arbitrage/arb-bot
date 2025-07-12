import { Address } from 'viem'
import { UNIV3_ROUTER_ABI } from '../../abi/uniV3/uniV3Router'
import { UNIV3_ROUTER02_ABI } from '../../abi/uniV3/uniV3Router02'
import { UniV3LikePool } from '../base/uniV3Bricks/UniV3LikePool'
import { PoolType } from '../poolVariety'

export class PancakeV3Pool extends UniV3LikePool {
	public readonly is02Router: boolean

	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
		periphery: UniV3PoolPeriphery,
	) {
		super(poolAddress, chainId, immutables, periphery, PoolType.PANCAKEV3)
		this.is02Router = periphery.is02Router ?? false
	}

	static async create(poolAddress: Address, chainId: number) {
		const { immutables, periphery } = await this.getPeripheryAndImmutables(
			poolAddress,
			chainId,
			PoolType.PANCAKEV3,
		)

		return new PancakeV3Pool(poolAddress, chainId, immutables, periphery)
	}

	async simulateSwap(params: SwapParams) {
		await this.validateSwapParams(params)

		const args = await this.getSwapArguments(params, this.is02Router)
		const abi = this.is02Router ? UNIV3_ROUTER02_ABI : UNIV3_ROUTER_ABI

		const { result: amountOut, request } =
			await this.client.simulateContract({
				address: this.routerAddress,
				abi,
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
