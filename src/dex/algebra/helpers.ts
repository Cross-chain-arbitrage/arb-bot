import { getContract } from "viem"
import { ALGEBRA_POOL_ABI } from "../../abi/algebra/algebraPool"
import { ClientManager } from "../../utils/ClientManager"

export async function getPoolImmutables(poolAddress: Address, chainId: number) {
	const client = ClientManager.getClient(chainId)

	const contract = getContract({
		address: poolAddress,
		abi: ALGEBRA_POOL_ABI,
		client,
	})

	const [slot0Data, fee, token0Address, token1Address] = await Promise.all([
		contract.read.globalState(),
		contract.read.fee(),
		contract.read.token0(),
		contract.read.token1(),
	])

	return {
		token0Address,
		token1Address,
		fee,
		tickSpacing: slot0Data[1],
	}
}
