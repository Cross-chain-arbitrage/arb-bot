import { Address, zeroAddress } from "viem"
import { ClientManager } from "../utils/ClientManager"
import { ALGEBRA_FACTORY_ABI } from "../abi/algebra/algebraFactory"
import { UniV3Pool } from "./uniswapV3/Pool"
import { AlgebraPool } from "./algebra/Pool"
import { TickPool } from "./TickPool"

export enum PoolType {
	UNIV3 = "uniV3",
	ALGEBRA = "algebra",
}

export class PoolUtils {
	static async createPool(
		chainId: number,
		poolAddress: Address,
		poolType: PoolType,
	): Promise<TickPool> {
		switch (poolType) {
			case PoolType.ALGEBRA:
				return AlgebraPool.create(poolAddress, chainId)
			case PoolType.UNIV3:
				return UniV3Pool.create(poolAddress, chainId)
		}
	}

	static async getPoolAddressFromFactory(
		factoryAddress: Address,
		token0Address: Address,
		token1Address: Address,
		chainId: number,
	): Promise<Address | null> {
		const client = ClientManager.getClient(chainId)

		try {
			// Get pool address from factory
			const poolAddress = await client.readContract({
				address: factoryAddress,
				abi: ALGEBRA_FACTORY_ABI,
				functionName: "poolByPair",
				args: [token0Address, token1Address],
			})

			if (poolAddress === zeroAddress) {
				return null
			}

			return poolAddress
		} catch (error) {
			console.error("Error fetching pool info:", error)
			return null
		}
	}
}
