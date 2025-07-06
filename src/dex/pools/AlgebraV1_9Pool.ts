import { getContract, zeroAddress } from 'viem'
import { ALGEBRA_V1_9_POOL_ABI } from '../../abi/algebraV1_9/algebraV1_9Pool'
import { ALGEBRA_V1_9_QUOTER_ABI } from '../../abi/algebraV1_9/algebraV1_9Quoter'
import { ALGEBRA_V1_9_ROUTER_ABI } from '../../abi/algebraV1_9/algebraV1_9Router'
import { Token } from '../../primitives/tokens/Token'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../utils/ClientManager'
import { UniV3LikePool } from '../base/UniV3LikePool/UniV3LikePool'
import { PoolType } from '../poolVariety'

export class AlgebraV1_9Pool extends UniV3LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
		periphery: PoolPeriphery,
	) {
		super(
			poolAddress,
			chainId,
			immutables,
			periphery,
			PoolType.ALGEBRA_V1_9,
		)
	}

	static override async getV3PoolImmutables(
		poolAddress: Address,
		chainId: number,
	): Promise<PoolImmutables> {
		const wallet = ClientManager.getWalletClient(chainId)

		const contract = getContract({
			address: poolAddress,
			abi: ALGEBRA_V1_9_POOL_ABI,
			client: wallet,
		})

		const [token0Address, token1Address, tickSpacing, factory] =
			await Promise.all([
				contract.read.token0(),
				contract.read.token1(),
				contract.read.tickSpacing(),
				contract.read.factory(),
			])

		const [token0, token1] = await Promise.all([
			TokenUtils.fromAddress<Token>(token0Address, chainId),
			TokenUtils.fromAddress<Token>(token1Address, chainId),
		])

		const fee = 0 //TODO: remove fee from immutables for algebra

		return {
			token0,
			token1,
			fee,
			tickSpacing,
			factory,
		}
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
			sdf: 0n,
		}
	}

	async simulateSwap(params: SwapParams) {
		await this.validateSwapParams(params)

		const args = await this.getAlgebraSwapArguments(params)

		const { result: amountOut, request } =
			await this.client.simulateContract({
				address: this.routerAddress,
				abi: ALGEBRA_V1_9_ROUTER_ABI,
				functionName: 'exactInputSingle',
				account: this.account.address,
				args: [args],
			})

		return {
			amountOut,
			request: request as unknown as SimulateRequestWithAccount,
		}
	}

	override async quoteSwapAmountOut(params: SwapParams) {
		this.validateMismatchSwapParams(params)

		const { result } = await this.client.simulateContract({
			address: this.quoterAddress,
			abi: ALGEBRA_V1_9_QUOTER_ABI,
			functionName: 'quoteExactInputSingle',
			account: this.account.address,
			args: [
				params.tokenIn.address,
				params.tokenOut.address,
				params.amountIn,
				0n, //sqrtMaxLimit
			],
		})

		return result[0]
	}

	static async create(poolAddress: Address, chainId: number) {
		const { periphery, immutables } = await this.getPeripheryAndImmutables(
			poolAddress,
			chainId,
			PoolType.ALGEBRA_V1_9,
		)

		return new AlgebraV1_9Pool(poolAddress, chainId, immutables, periphery)
	}
}
