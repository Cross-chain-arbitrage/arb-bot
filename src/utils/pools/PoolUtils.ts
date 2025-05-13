import { Address, zeroAddress } from "viem"
import { ALGEBRA_POOL_ABI } from "../../abi/algebra/algebraPool"
import { ClientManager } from "../ClientManager"
import { UNIV3_POOL_ABI } from "../../abi/univ3Pool"
import { TokenUtils } from "../tokens/TokenUtils"
import { BasePool } from "./BasePool"
import { AlgebraPool } from "../../algebra/Pool"
import { Token } from "../tokens/Token"
import { ALGEBRA_FACTORY_ABI } from "../../abi/algebra/algebraFactory"
import { UniV3Pool } from "../../uniswapV3/Pool"

export enum PoolType {
	UNIV3 = "uniV3",
	ALGEBRA = "algebra",
}

export class PoolUtils {
	static async createPool(
		poolAddress: Address,
		chainId: number,
		poolType: PoolType,
	): Promise<BasePool> {
		let immutables: PoolImmutables

		if (poolType === PoolType.ALGEBRA) {
			immutables = await this.getAlgebraPoolImmutable(
				chainId,
				poolAddress,
			)
		} else {
			immutables = await this.getUniV3PoolInfo(poolAddress, chainId)
		}

		const token0 = await TokenUtils.fromAddress<Token>(
			immutables.token0 as Address,
			chainId,
		)
		const token1 = await TokenUtils.fromAddress<Token>(
			immutables.token1 as Address,
			chainId,
		)

		switch (poolType) {
			case PoolType.ALGEBRA:
				return new AlgebraPool(
					poolAddress,
					chainId,
					token0,
					token1,
					immutables.fee,
					immutables.tickSpacing,
				)
			case PoolType.UNIV3:
				return new UniV3Pool(
					poolAddress,
					chainId,
					token0,
					token1,
					immutables.fee,
					immutables.tickSpacing,
				)
		}
	}

	static async getAlgebraPoolImmutable(
		chainId: number,
		poolAddress: Address,
	): Promise<PoolImmutables> {
		const client = ClientManager.getClient(chainId)
		const address = poolAddress

		// Get pool data
		const [slot0Data, fee, token0, token1] = await Promise.all([
			client.readContract({
				address,
				abi: ALGEBRA_POOL_ABI,
				functionName: "globalState",
			}),
			client.readContract({
				address,
				abi: ALGEBRA_POOL_ABI,
				functionName: "fee",
			}),
			client.readContract({
				address,
				abi: ALGEBRA_POOL_ABI,
				functionName: "token0",
			}),
			client.readContract({
				address,
				abi: ALGEBRA_POOL_ABI,
				functionName: "token1",
			}),
		])

		return {
			token0,
			token1,
			fee,
			tickSpacing: slot0Data[1],
		}
	}

	static async getUniV3PoolInfo(
		address: Address,
		chainId: number,
	): Promise<PoolImmutables> {
		const client = ClientManager.getClient(chainId)

		const abi = UNIV3_POOL_ABI

		// Get pool data
		const [slot0Data, token0, token1, fee] = await Promise.all([
			client.readContract({
				address,
				abi,
				functionName: "slot0",
			}),

			client.readContract({
				address,
				abi,
				functionName: "token0",
			}),
			client.readContract({
				address,
				abi,
				functionName: "token1",
			}),
			client.readContract({
				address,
				abi,
				functionName: "fee",
			}),
		])

		return {
			token0,
			token1,
			fee,
			tickSpacing: slot0Data[1],
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
