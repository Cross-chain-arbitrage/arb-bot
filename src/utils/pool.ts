import { Address } from "viem"
import { POOL_ABI } from "../abi/univ3Pool"
import { Token } from "./token"
import { ClientManager } from "./ClientManager"

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
	chainId: number,
): Promise<[Token, Token]> {
	const client = ClientManager.getClient(chainId)

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

	const token0 = await Token.fromAddress(token0Address, chainId)
	const token1 = await Token.fromAddress(token1Address, chainId)

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
