import { Address, PublicClient, zeroAddress } from "viem"
import { Token } from "../utils/token"
import { FACTORY_ABI } from "../abi/factory"
import { POOL_ABI } from "../abi/univ3Pool"
import { PoolInfo, sqrtPriceX96ToPrice } from "../utils/pool"

/* ======== MAIN FUNCTIONS ======== */

export async function getPoolAddressOfUniV3Pool(
	factory: Address,
	token0Address: Address,
	token1Address: Address,
	fee: number,
	client: PublicClient,
): Promise<PoolInfo | null> {
	try {
		// Get pool address
		const poolAddress = await client.readContract({
			address: factory,
			abi: FACTORY_ABI,
			functionName: "getPool",
			args: [token0Address, token1Address, fee],
		})

		if (poolAddress === zeroAddress) {
			return null
		}

		// Get pool data
		const [slot0Data, liquidityData, token0, token1] = await Promise.all([
			client.readContract({
				address: poolAddress,
				abi: POOL_ABI,
				functionName: "slot0",
			}),
			client.readContract({
				address: poolAddress,
				abi: POOL_ABI,
				functionName: "liquidity",
			}),
			client.readContract({
				address: poolAddress,
				abi: POOL_ABI,
				functionName: "token0",
			}),
			client.readContract({
				address: poolAddress,
				abi: POOL_ABI,
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

async function getPoolInfo(
	poolAddress: Address,
	client: PublicClient,
): Promise<PoolInfo | null> {
	try {
		if (poolAddress === zeroAddress) {
			throw new Error("Zero pool address")
		}

		// Get pool data
		const [slot0Data, liquidityData, token0, token1, fee] =
			await Promise.all([
				client.readContract({
					address: poolAddress,
					abi: POOL_ABI,
					functionName: "slot0",
				}),
				client.readContract({
					address: poolAddress,
					abi: POOL_ABI,
					functionName: "liquidity",
				}),
				client.readContract({
					address: poolAddress,
					abi: POOL_ABI,
					functionName: "token0",
				}),
				client.readContract({
					address: poolAddress,
					abi: POOL_ABI,
					functionName: "token1",
				}),
				client.readContract({
					address: poolAddress,
					abi: POOL_ABI,
					functionName: "fee",
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

export async function getTokenPricesFromUniV3Pool(
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
