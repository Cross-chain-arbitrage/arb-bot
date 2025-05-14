import { Address, zeroAddress } from "viem"
import { Token } from "../../utils/tokens/Token"
import { ClientManager } from "../../utils/ClientManager"
import { ALGEBRA_POOL_ABI } from "../../abi/algebra/algebraPool"
import { TickPool } from "../TickPool"
import { getContract } from "viem"
import { TokenUtils } from "../../utils/tokens/TokenUtils"
import { ALGEBRA_ROUTER_ABI } from "../../abi/algebra/algebraRouter"

const MIN_SQRT_RATIO = 4295128739n
const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n

export class AlgebraPool extends TickPool {
	router: Address = "0x6E055FfA786Dfe9DBB214b649a9b2A169e6B820b"

	constructor(
		poolAddress: Address,
		chainId: number,
		token0: Token,
		token1: Token,
		fee: number,
		tickSpacing: number,
	) {
		super(poolAddress, chainId, token0, token1, fee, tickSpacing)
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

	async getPrices(): Promise<number> {
		const address = this.address

		const [sqrtPriceX96] = await this.client.readContract({
			address,
			abi: ALGEBRA_POOL_ABI,
			functionName: "globalState",
		})

		const token0Decimals = this.token0.decimals
		const token1Decimals = this.token1.decimals

		// Calculate price
		const price = this.sqrtPriceX96ToPrice(
			sqrtPriceX96,
			token0Decimals,
			token1Decimals,
		)

		return price
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

	async simulateSwap(params: SwapParams) {
		const { tokenIn, tokenOut, amountIn, slippage } = params

		const zeroToOne = this.zeroToOne(tokenIn)

		const sqrtMaxLimit = zeroToOne
			? MIN_SQRT_RATIO + 1n
			: MAX_SQRT_RATIO - 1n

		const amountOutMinimum = 0n

		// Simulate swap
		const { result: amountOut } = await this.client.simulateContract({
			address: this.router,
			abi: ALGEBRA_ROUTER_ABI,
			functionName: "exactInputSingle",
			account: this.account.address,
			args: [
				{
					tokenIn: tokenIn.address,
					tokenOut: tokenOut.address,
					deployer: zeroAddress, // deployer?
					recipient: this.account.address,
					deadline: BigInt(
						Math.floor(Date.now() / 1000) + 1000 * 60 * 5,
					), // 5 minutes
					amountIn,
					amountOutMinimum,
					limitSqrtPrice: sqrtMaxLimit,
				},
			],
		})

		return amountOut
	}

	async swap(params: SwapParams) {
		const { amountIn, tokenIn } = params

		const amountOut = await this.simulateSwap(params)

		const zeroToOne = this.zeroToOne(tokenIn)

		const sqrtMaxLimit = zeroToOne
			? MIN_SQRT_RATIO + 1n
			: MAX_SQRT_RATIO - 1n

		const hash = await this.wallet.writeContract({
			address: this.address,
			abi: ALGEBRA_POOL_ABI,
			account: this.account,
			chain: this.wallet.chain,
			functionName: "swap",
			args: [
				this.account.address || zeroAddress,
				this.zeroToOne(tokenIn),
				amountIn,
				this.calculateMinAmountOut(amountOut, params.slippage),
				"0x",
			],
		})

		// TODO: maybe return hash and don't wait for receipt
		const receipt = await this.client.waitForTransactionReceipt({ hash })

		return receipt
	}

	private zeroToOne(tokenIn: Token) {
		return (
			tokenIn.address.toLowerCase() === this.token0.address.toLowerCase()
		)
	}
}
