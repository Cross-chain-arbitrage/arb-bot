import { Address, zeroAddress } from 'viem'
import { ALGEBRA_QUOTER_ABI } from '../../abi/algebra/algebraQuoter'
import { ALGEBRA_ROUTER_ABI } from '../../abi/algebra/algebraRouter'
import {
	getV3PoolImmutables,
	validateAndGetPeriphery,
} from '../base/poolCreationHelpers'
import { UniV3LikePool } from '../base/UniV3LikePool'
import { PoolType } from '../poolVariety'

export class AlgebraPool extends UniV3LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
	) {
		const periphery = validateAndGetPeriphery(
			chainId,
			PoolType.ALGEBRA,
		) as PoolPeriphery

		super(poolAddress, chainId, immutables, periphery, PoolType.ALGEBRA)
	}

	static async create(poolAddress: Address, chainId: number) {
		const immutables = await getV3PoolImmutables(
			poolAddress,
			chainId,
			PoolType.ALGEBRA,
		)

		return new AlgebraPool(poolAddress, chainId, immutables)
	}

	async getAlgebraSwapArguments(params: SwapParams) {
		const { amountOut } = await this.quoteSwap(params)

		const amountOutMinimum = this.calcMinAmountOut(
			amountOut,
			params.slippage ?? this.defaultSlippage,
		)

		return {
			tokenIn: params.tokenIn.address,
			tokenOut: params.tokenOut.address,
			deployer: zeroAddress,
			recipient: this.account.address,
			deadline: this.calcDeadline(60 * 5),
			amountIn: params.amountIn,
			amountOutMinimum,
			limitSqrtPrice: 0n, // amountOutMinimum is enough for ensuring slippage
		}
	}

	/**
	 * @dev override the quoteSwap method to use the AlgebraQuoter ABI and unique arguments
	 */
	async quoteSwap(params: SwapParams) {
		this.validateMismatchSwapParams(params)

		const { result } = await this.client.simulateContract({
			address: this.quoterAddress,
			abi: ALGEBRA_QUOTER_ABI,
			functionName: 'quoteExactInputSingle',
			account: this.account.address,
			args: [
				params.tokenIn.address,
				params.tokenOut.address,
				zeroAddress, //deployer
				params.amountIn,
				0n, //sqrtMaxLimit
			],
		})

		return { amountOut: result[0], fee: result[1] }
	}

	async simulateSwap(params: SwapParams) {
		await this.validateSwapParams(params)

		const args = await this.getAlgebraSwapArguments(params)

		const { result: amountOut, request } =
			await this.client.simulateContract({
				address: this.routerAddress,
				abi: ALGEBRA_ROUTER_ABI,
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
