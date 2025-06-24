import { Address } from 'viem'
import { UNIV3_ROUTER_ABI } from '../../abi/uniV3/uniV3Router'
import { UniV3LikePool } from '../base/UniV3LikePool'
import {
	getV3PoolImmutables,
	validateAndGetPeriphery,
} from '../base/poolCreationHelpers'
import { PoolType } from '../poolVariety'

export class UniV3Pool extends UniV3LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
	) {
		const periphery = validateAndGetPeriphery(
			chainId,
			PoolType.UNIV3,
		) as PoolPeriphery

		super(poolAddress, chainId, immutables, periphery, PoolType.UNIV3)
	}

	static async create(poolAddress: Address, chainId: number) {
		const immutables = await getV3PoolImmutables(
			poolAddress,
			chainId,
			PoolType.UNIV3,
		)

		return new UniV3Pool(poolAddress, chainId, immutables)
	}

	async getSwapArguments(params: SwapParams) {
		const { amountOut } = await this.quoteSwap(params)

		const amountOutMinimum = this.calcMinAmountOut(
			amountOut,
			params.slippage ?? this.defaultSlippage,
		)

		const args = {
			tokenIn: params.tokenIn.address,
			tokenOut: params.tokenOut.address,
			fee: this.fee,
			recipient: this.account.address,
			deadline: this.calcDeadline(60 * 5),
			amountIn: params.amountIn,
			amountOutMinimum,
			sqrtPriceLimitX96: 0n,
		}

		return args
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
