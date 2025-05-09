import { Address, PublicClient, zeroAddress } from "viem"
import { Token } from "../utils/token"
import { ALGEBRA_POOL_ABI } from "../abi/algebra/algebraPool"
import { ALGEBRA_FACTORY_ABI } from "../abi/algebra/algebraFactory"
import { PoolInfo, sqrtPriceX96ToPrice } from "../utils/pool"

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
	client: PublicClient,
): Promise<PoolInfo | null> {
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
	client: PublicClient,
): Promise<number | null> {
	try {
		const poolInfo = await getPoolInfo(poolAddress, client)

		if (!poolInfo) {
			throw new Error("No pool info found")
		}

		const token0 = await Token.fromAddress(poolInfo.token0, client)
		const token1 = await Token.fromAddress(poolInfo.token1, client)

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
