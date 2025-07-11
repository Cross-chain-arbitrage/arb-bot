import { decodeEventLog, isAddressEqual, TransactionReceipt } from 'viem'
import { VELODROME_UNIVERSAL_ROUTER_ABI } from '../../abi/velodrome/velodromeUniversalRouter'
import { VELODROME_V2_FACTORY_ABI } from '../../abi/velodrome/velodromeV2Factory'
import { VELODROME_V2_POOL_ABI } from '../../abi/velodrome/velodromeV2Pool'
import { Token } from '../../primitives/tokens/Token'
import { ClientManager } from '../../utils/ClientManager'
import { UniV2LikePool } from '../base/UniV2Like/UniV2LikePool'
import { POOL_ERRORS, PoolType } from '../poolVariety'
import { CommandType, RoutePlanner } from '../velodromeUniversalRouterPlanner'

// Velodrome V2 is AMM and Velodrome V2 is concentrated liquidity
export class VelodromeV2Pool extends UniV2LikePool {
	isStable: boolean

	constructor(
		poolAddress: Address,
		chainId: number,
		token0: Token,
		token1: Token,
		periphery: UniV2PoolPeriphery,
		factory: Address,
		fee: number,
		isStable: boolean,
	) {
		super(
			token0,
			token1,
			poolAddress,
			periphery.router,
			chainId,
			fee,
			PoolType.VELODROME_V2,
			factory,
		)

		if (isStable) {
			throw new Error(
				'Velodrome V2 stable pools are not supported (need to implement calculateAmountOut for another curve type)',
			)
		}
		this.isStable = isStable
	}

	static async getFee(
		poolAddress: Address,
		factory: Address,
		chainId: number,
	) {
		const client = ClientManager.getClient(chainId)

		const isStable = await client.readContract({
			address: poolAddress,
			abi: VELODROME_V2_POOL_ABI,
			functionName: 'stable',
		})

		const fee = await client.readContract({
			address: factory,
			abi: VELODROME_V2_FACTORY_ABI,
			functionName: 'getFee',
			args: [poolAddress, isStable],
		})

		return { fee, isStable }
	}

	static async create(poolAddress: Address, chainId: number) {
		const { periphery, tokens, factory } =
			await this.getPeripheryAndImmutables(
				poolAddress,
				chainId,
				PoolType.VELODROME_V2,
			)

		const { fee, isStable } = await VelodromeV2Pool.getFee(
			poolAddress,
			factory,
			chainId,
		)

		return new VelodromeV2Pool(
			poolAddress,
			chainId,
			tokens.token0,
			tokens.token1,
			periphery,
			factory,
			Number(fee),
			isStable,
		)
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
			functionName: 'VELODROME_V2_FACTORY',
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
		path += this.isStable ? '01' : '00'
		path += tokenOut.address.slice(2)

		return path as Bytes
	}

	override parseAmounts(
		swapReceipt: TransactionReceipt,
		tokenIn: Token,
		tokenOut: Token,
	): { amountOut: bigint; amountIn: bigint } {
		const swapEvent = swapReceipt.logs
			.map((log) => {
				if (!isAddressEqual(log.address, this.address)) return null

				const event = decodeEventLog({
					abi: VELODROME_V2_POOL_ABI,
					data: log.data,
					topics: log.topics,
				})

				return event
			})
			.find((event) => event?.eventName === 'Swap')

		if (!swapEvent) throw new this.customError('Swap event not found')

		const zeroForOne = this.zeroForOne(tokenIn, tokenOut)

		const { amount0In, amount0Out, amount1In, amount1Out } = swapEvent.args

		const [amountIn, amountOut] = zeroForOne
			? [amount0In, amount1Out]
			: [amount1In, amount0Out]

		return { amountOut, amountIn }
	}

	override async simulateSwap(params: SwapParams) {
		this.validateMismatchSwapParams(params)

		const planner = new RoutePlanner()

		const slippage = BigInt(params.slippage ?? 0)

		const { amountOut } = await this.quoteSwap(params)

		const amountOutMinimum = (amountOut * (10000n - slippage)) / 10000n

		planner.addCommand(CommandType.V2_SWAP_EXACT_IN, {
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
}
