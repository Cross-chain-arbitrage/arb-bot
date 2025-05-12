import { Address, PublicClient, zeroAddress } from "viem"
import { ALGEBRA_POOL_ABI } from "../abi/algebra/algebraPool"
import { ALGEBRA_FACTORY_ABI } from "../abi/algebra/algebraFactory"
import { PoolInfo, sqrtPriceX96ToPrice } from "../utils/pool"
import { ClientManager } from "../utils/ClientManager"
import { TokenUtils } from "../utils/tokens/TokenUtils"

export async function getPoolAddressOfAlgebraPool(
	factoryAddress: Address,
	token0Address: Address,
	token1Address: Address,
	client: PublicClient,
): Promise<Address | null> {
	try {
		// Get pool address from Algebra factory
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

async function getPoolInfo(
	poolAddress: Address,
	chainId: number,
): Promise<PoolInfo | null> {
	const client = ClientManager.getClient(chainId)

	try {
		if (poolAddress === zeroAddress) {
			throw new Error("Zero pool address")
		}

		// Get pool data
		const [slot0Data, liquidityData, fee, token0, token1] =
			await Promise.all([
				client.readContract({
					address: poolAddress,
					abi: ALGEBRA_POOL_ABI,
					functionName: "globalState",
				}),
				client.readContract({
					address: poolAddress,
					abi: ALGEBRA_POOL_ABI,
					functionName: "liquidity",
				}),
				client.readContract({
					address: poolAddress,
					abi: ALGEBRA_POOL_ABI,
					functionName: "fee",
				}),
				client.readContract({
					address: poolAddress,
					abi: ALGEBRA_POOL_ABI,
					functionName: "token0",
				}),
				client.readContract({
					address: poolAddress,
					abi: ALGEBRA_POOL_ABI,
					functionName: "token1",
				}),
			])

		return {
			token0,
			token1,
			fee,
			sqrtPriceX96: slot0Data[0],
			tick: slot0Data[1],
			liquidity: liquidityData,
		}
	} catch (error) {
		console.error("Error fetching pool info:", error)
		return null
	}
}

export async function getTokenPricesFromAlgebraPool(
	poolAddress: Address,
	chainId: number,
): Promise<number | null> {
	try {
		const poolInfo = await getPoolInfo(poolAddress, chainId)

		if (!poolInfo) {
			throw new Error("No pool info found")
		}

		const token0 = await TokenUtils.fromAddress(poolInfo.token0, chainId)
		const token1 = await TokenUtils.fromAddress(poolInfo.token1, chainId)

		// Calculate price
		const price = sqrtPriceX96ToPrice(
			poolInfo.sqrtPriceX96,
			token0.decimals,
			token1.decimals,
		)

		return price
	} catch (error) {
		console.error("Error getting token price:", error)
		return null
	}
}
