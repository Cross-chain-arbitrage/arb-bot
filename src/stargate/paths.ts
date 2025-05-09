import { Address, PublicClient } from "viem"
import { getChainEIdByNativeChainId } from "../layerzero/utils"
import { STARGATE_POOL_ABI } from "../abi/stargate/stgPool"

export async function getPathCredits(
	pool: Address,
	toChainId: number,
	client: PublicClient,
): Promise<bigint> {
	if (client.chain?.id === toChainId) {
		throw new Error("Cannot getPath() to the same chain")
	}

	const remoteEId = getChainEIdByNativeChainId(toChainId)
	const credits = await client.readContract({
		address: pool,
		abi: STARGATE_POOL_ABI,
		functionName: "paths",
		args: [remoteEId],
	})

	return credits
}
