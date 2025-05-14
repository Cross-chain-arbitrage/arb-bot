import { Address, getContract, TransactionReceipt } from "viem"
import { TickPool } from "../TickPool"
import { Token } from "../../utils/tokens/Token"
import { UNIV3_POOL_ABI } from "../../abi/univ3Pool"
import { ClientManager } from "../../utils/ClientManager"
import { TokenUtils } from "../../utils/tokens/TokenUtils"

export class UniV3Pool extends TickPool {
	constructor(
		poolAddress: Address,
		chainId: number,
		token0: Token,
		token1: Token,
		fee: number,
		tickSpacing: number,
	) {
		// TODO: Add router address
		super(poolAddress, chainId, token0, token1, fee, tickSpacing, "0x")
	}

	static async create(poolAddress: Address, chainId: number) {
		const immutables = await this.getPoolImmutables(poolAddress, chainId)

		return new UniV3Pool(
			poolAddress,
			chainId,
			await TokenUtils.fromAddress(immutables.token0, chainId),
			await TokenUtils.fromAddress(immutables.token1, chainId),
			immutables.fee,
			immutables.tickSpacing,
		)
	}

	async getPrices(): Promise<{ price: number; sqrtPriceX96: bigint }> {
		const address = this.address

		const [sqrtPriceX96] = await this.client.readContract({
			address,
			abi: UNIV3_POOL_ABI,
			functionName: "slot0",
		})

		// Calculate price
		const price = this.sqrtPriceX96ToPrice(sqrtPriceX96)

		return { price, sqrtPriceX96 }
	}

	static async getPoolImmutables(address: Address, chainId: number) {
		const client = ClientManager.getClient(chainId)

		const contract = getContract({
			address,
			abi: UNIV3_POOL_ABI,
			client,
		})

		// Get pool data
		const [slot0Data, token0, token1, fee] = await Promise.all([
			contract.read.slot0(),
			contract.read.token0(),
			contract.read.token1(),
			contract.read.fee(),
		])

		return {
			token0,
			token1,
			fee,
			tickSpacing: slot0Data[1],
		}
	}

	async simulateSwap(params: SwapParams) {
		// TODO: Implement
		return { amountOut: 0n, args: {} as SwapArgs }
	}

	async swap(params: SwapParams) {
		// TODO: Implement
		return { receipt: {} as TransactionReceipt, amountOut: 0n }
	}
}
