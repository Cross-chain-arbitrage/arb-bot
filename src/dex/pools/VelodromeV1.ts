import { isAddressEqual, toHex } from 'viem'
import { VELODROME_MIXED_QUOTER } from '../../abi/velodrome/velodromeMixedQuoter'
import { VELODROME_UNIVERSAL_ROUTER_ABI } from '../../abi/velodrome/velodromeUniversalRouter'
import { Token } from '../../primitives/tokens/Token'
import { ClientManager } from '../../utils/ClientManager'
import { UniV3LikePool } from '../base/UniV3LikePool/UniV3LikePool'
import { POOL_ERRORS, PoolType } from '../poolVariety'
import { CommandType, RoutePlanner } from '../velodromeUniversalRouterPlanner'

// Velodrome V2 is AMM and Velodrome V2 is concentrated liquidity
export class VelodromeV1Pool extends UniV3LikePool {
	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
		periphery: UniV3PoolPeriphery,
	) {
		super(
			poolAddress,
			chainId,
			immutables,
			periphery,
			PoolType.VELODROME_V1,
		)
	}

	static async create(poolAddress: Address, chainId: number) {
		const { immutables, periphery } = await this.getPeripheryAndImmutables(
			poolAddress,
			chainId,
			PoolType.VELODROME_V1,
		)

		return new VelodromeV1Pool(poolAddress, chainId, immutables, periphery)
	}

	static override async validatePeriphery(
		chainId: number,
		poolType: PoolType,
		periphery: UniV2PoolPeriphery,
		poolFactory: Address,
	) {
		const client = ClientManager.getClient(chainId)

		const routerFactoryAddress = await client.readContract({
			address: periphery.router,
			abi: VELODROME_UNIVERSAL_ROUTER_ABI,
			functionName: 'VELODROME_CL_FACTORY',
		})

		if (!isAddressEqual(routerFactoryAddress, poolFactory)) {
			throw new POOL_ERRORS[poolType](
				`Invalid periphery: router factory ${routerFactoryAddress} does not match pool factory ${poolFactory}`,
			)
		}
	}

	buildPath(tokenIn: Token, tokenOut: Token): Bytes {
		let path = '0x'

		path += tokenIn.address.slice(2)
		path += toHex(1, { size: 3 }).slice(2)
		path += tokenOut.address.slice(2)

		return path as Bytes
	}

	override async simulateSwap(params: SwapParams) {
		this.validateMismatchSwapParams(params)

		const planner = new RoutePlanner()

		const slippage = BigInt(params.slippage ?? 0)

		const { amountOut } = await this.quoteSwap(params)

		const amountOutMinimum = (amountOut * (10000n - slippage)) / 10000n

		planner.addCommand(CommandType.V3_SWAP_EXACT_IN, {
			recipient: this.account.address,
			amountIn: params.amountIn,
			amountOutMinimum,
			path: this.buildPath(params.tokenIn, params.tokenOut),
			payerIsUser: true,
			isUni: false,
		})

		const { request } = await this.client.simulateContract({
			address: this.routerAddress,
			abi: VELODROME_UNIVERSAL_ROUTER_ABI,
			functionName: 'execute',
			account: this.account.address,
			args: [planner.commands, planner.inputs],
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
			abi: VELODROME_MIXED_QUOTER,
			functionName: 'quoteExactInputSingleV3',
			account: this.account,
			args: [
				{
					tokenIn: params.tokenIn.address,
					tokenOut: params.tokenOut.address,
					amountIn: params.amountIn,
					tickSpacing: this.tickSpacing,
					sqrtPriceLimitX96: 0n,
				},
			],
		})

		return result[0]
	}
}
