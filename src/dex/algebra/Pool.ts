import { Address, decodeEventLog, zeroAddress } from 'viem'
import { ALGEBRA_POOL_ABI } from '../../abi/algebra/algebraPool'
import { TickPool } from '../TickPool'
import { ALGEBRA_ROUTER_ABI } from '../../abi/algebra/algebraRouter'
import { routers } from './data'
import { isSameAddress } from '../../utils/common'
import { calcDeadline, getPoolImmutables } from './helpers'

export class AlgebraPool extends TickPool {
	constructor(
		poolAddress: Address,
		chainId: number,
		immutables: PoolImmutables,
	) {
		const routerAddress = routers[chainId]

		if (!routerAddress)
			throw new Error(`No router found for chain ${chainId}`)

		super(poolAddress, chainId, immutables, routerAddress)
	}

	static async create(poolAddress: Address, chainId: number) {
		const immutables = await getPoolImmutables(poolAddress, chainId)

		return new AlgebraPool(poolAddress, chainId, immutables)
	}

	async getPrices() {
		const address = this.address

		const [sqrtPriceX96] = await this.client.readContract({
			address,
			abi: ALGEBRA_POOL_ABI,
			functionName: 'globalState',
		})

		const price = this.sqrtPriceX96ToPrice(sqrtPriceX96)

		return { price, sqrtPriceX96 }
	}

	async getSwapArguments(params: SwapParams) {
		const { price } = await this.getPrices()

		const { amountOutMinimum, sqrtMaxLimit } =
			this.calcMinAmountOutAndSqrtLimit(params, price)

		return {
			tokenIn: params.tokenIn.address,
			tokenOut: params.tokenOut.address,
			deployer: zeroAddress,
			recipient: this.account.address,
			deadline: calcDeadline(60 * 5),
			amountIn: params.amountIn,
			amountOutMinimum,
			limitSqrtPrice: sqrtMaxLimit,
		}
	}

	async simulateSwap(params: SwapParams) {
		await this.validateSwapParams(params)

		const args = await this.getSwapArguments(params)

		const { result: amountOut } = await this.client.simulateContract({
			address: this.routerAddress,
			abi: ALGEBRA_ROUTER_ABI,
			functionName: 'exactInputSingle',
			account: this.account.address,
			args: [args],
		})

		return { amountOut, args }
	}

	async swap(params: SwapParams) {
		const { args } = await this.simulateSwap(params)

		const hash = await this.wallet.writeContract({
			address: this.routerAddress,
			abi: ALGEBRA_ROUTER_ABI,
			account: this.account,
			chain: this.wallet.chain,
			functionName: 'exactInputSingle',
			args: [args],
		})

		const receipt = await this.client.waitForTransactionReceipt({ hash })

		const swapEvent = receipt.logs
			.map((log) => {
				if (!isSameAddress(log.address, this.address)) return null

				const event = decodeEventLog({
					abi: ALGEBRA_POOL_ABI,
					data: log.data,
					topics: log.topics,
				})

				return event
			})
			.find((event) => event?.eventName === 'Swap')

		if (!swapEvent) throw new Error('Swap event not found')

		const amountOut =
			swapEvent.args.amount0 < 0n
				? -swapEvent.args.amount0
				: -swapEvent.args.amount1

		return { receipt, amountOut }
	}
}
