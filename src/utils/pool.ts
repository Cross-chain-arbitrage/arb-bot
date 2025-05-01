import { Address, PublicClient } from "viem"
import { POOL_ABI } from "../abi/univ3Pool"
import { Token } from "./token"

export interface PoolInfo {
	token0: Address
	token1: Address
	fee: number
	sqrtPriceX96: bigint
	liquidity: bigint
	tick: number
}

export async function getPoolTokens(
	poolAddress: Address,
	client: PublicClient,
): Promise<[Token, Token]> {
	const [token0Address, token1Address] = await Promise.all([
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

	const token0 = await Token.fromAddress(token0Address, client)
	const token1 = await Token.fromAddress(token1Address, client)

	return [token0, token1]
}

export function sqrtPriceX96ToPrice(
	sqrtPriceX96: bigint,
	decimals0: number,
	decimals1: number,
): number {
	const price = Number(sqrtPriceX96) ** 2 / 2 ** 192
	return price * 10 ** (decimals0 - decimals1)
}
