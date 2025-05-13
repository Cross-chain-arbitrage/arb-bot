import { Address } from "viem"
import { Token } from "../../utils/tokens/Token"
import { ClientManager } from "../../utils/ClientManager"
import { ALGEBRA_POOL_ABI } from "../../abi/algebra/algebraPool"
import { TickPool } from "../TickPool"
import { getContract } from "viem"
import { TokenUtils } from "../../utils/tokens/TokenUtils"

export class AlgebraPool extends TickPool {
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
}
