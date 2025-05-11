import { Address } from "viem"
import { getChainEIdByNativeChainId } from "../layerzero/utils"
import { STARGATE_POOL_ABI } from "../abi/stargate/stgPool"
import { ClientManager } from "../utils/ClientManager"

export async function getPathCredits(
	pool: Address,
	toChainId: number,
	chainId: number,
): Promise<bigint> {
	const client = ClientManager.getClient(chainId)

	if (chainId === toChainId) {
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
