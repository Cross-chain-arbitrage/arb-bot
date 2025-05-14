import { Address, zeroAddress } from "viem"
import { Token } from "../../utils/tokens/Token"
import { ClientManager } from "../../utils/ClientManager"
import { ALGEBRA_POOL_ABI } from "../../abi/algebra/algebraPool"
import { TickPool } from "../TickPool"
import { getContract } from "viem"
import { TokenUtils } from "../../utils/tokens/TokenUtils"
import { ALGEBRA_ROUTER_ABI } from "../../abi/algebra/algebraRouter"
import { routers } from "./data"

export class AlgebraPool extends TickPool {
	constructor(
		poolAddress: Address,
		chainId: number,
		token0: Token,
		token1: Token,
		fee: number,
		tickSpacing: number,
	) {
		const router = routers[chainId]

		if (!router) throw new Error(`No router found for chain ${chainId}`)

		super(poolAddress, chainId, token0, token1, fee, tickSpacing, router)
	}

	static async create(poolAddress: Address, chainId: number) {
		const immutables = await this.getPoolImmutables(poolAddress, chainId)

		return new AlgebraPool(
			poolAddress,
			chainId,
			await TokenUtils.fromAddress(immutables.token0, chainId),
			await TokenUtils.fromAddress(immutables.token1, chainId),
			immutables.fee,
			immutables.tickSpacing,
		)
	}

	async getPrices() {
		const address = this.address

		const [sqrtPriceX96] = await this.client.readContract({
			address,
			abi: ALGEBRA_POOL_ABI,
			functionName: "globalState",
		})

		const price = this.sqrtPriceX96ToPrice(sqrtPriceX96)

		return { price, sqrtPriceX96 }
	}

	static async getPoolImmutables(poolAddress: Address, chainId: number) {
		const client = ClientManager.getClient(chainId)

		const contract = getContract({
			address: poolAddress,
			abi: ALGEBRA_POOL_ABI,
			client,
		})

		const [slot0Data, fee, token0, token1] = await Promise.all([
			contract.read.globalState(),
			contract.read.fee(),
			contract.read.token0(),
			contract.read.token1(),
		])

		return {
			token0,
			token1,
			fee,
			tickSpacing: slot0Data[1],
		}
	}

	// TODO: refactor
	private getSwapArguments(params: SwapParams, price: number) {
		const { tokenIn, tokenOut, amountIn, slippage = 50 } = params

		const zeroToOne = this.zeroToOne(tokenIn)

		const formattedAmountIn = Number(amountIn) / 10 ** tokenIn.decimals

		const formattedAmountOutByPrice = zeroToOne
			? formattedAmountIn * price
			: formattedAmountIn / price

		const amountOutByPrice = BigInt(Math.floor(formattedAmountOutByPrice))

		const amountOutMinimum = this.calculateMinAmountOut(
			amountOutByPrice,
			slippage,
		)

		const sqrtMaxLimit = zeroToOne
			? this.priceToSqrtPriceX96(price * (1 - slippage / 10000))
			: this.priceToSqrtPriceX96(price * (1 + slippage / 10000))

		return {
			tokenIn: tokenIn.address as Address,
			tokenOut: tokenOut.address as Address,
			deployer: zeroAddress as Address,
			recipient: this.account.address,
			deadline: BigInt(Math.floor(Date.now() / 1000) + 1000 * 60 * 5),
			amountIn,
			amountOutMinimum,
			limitSqrtPrice: sqrtMaxLimit,
		}
	}

	async simulateSwap(params: SwapParams) {
		const { price } = await this.getPrices()

		const args = this.getSwapArguments(params, price)

		const { result: amountOut } = await this.client.simulateContract({
			address: this.routerAddress,
			abi: ALGEBRA_ROUTER_ABI,
			functionName: "exactInputSingle",
			account: this.account.address,
			args: [args],
		})

		// TODO: add swap args to returned object
		return { amountOut, args }
	}

	async swap(params: SwapParams) {
		const { args } = await this.simulateSwap(params)

		const hash = await this.wallet.writeContract({
			address: this.routerAddress,
			abi: ALGEBRA_ROUTER_ABI,
			account: this.account,
			chain: this.wallet.chain,
			functionName: "exactInputSingle",
			args: [args],
		})

		const receipt = await this.client.waitForTransactionReceipt({ hash })

		//TODO: extract amountOut from event and return it
		return { receipt }
	}

	private zeroToOne(tokenIn: Token) {
		return (
			tokenIn.address.toLowerCase() === this.token0.address.toLowerCase()
		)
	}
}
