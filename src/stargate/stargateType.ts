import { Address, PublicClient } from "viem"
import { STARGATE_POOL_ABI } from "../abi/stgPool"

export async function getStargateType(
	poolAddress: Address,
	client: PublicClient,
): Promise<number> {
	try {
		return await client.readContract({
			address: poolAddress,
			abi: STARGATE_POOL_ABI,
			functionName: "stargateType",
		})
	} catch (error) {
		throw new Error(
			`Token ${poolAddress} on chain ${client.chain?.name} is not a Stargate pool or OFT`,
		)
	}
}
