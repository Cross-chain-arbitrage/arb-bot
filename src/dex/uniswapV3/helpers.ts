import { getContract } from 'viem'
import { ClientManager } from '../../utils/ClientManager'
import { TokenUtils } from '../../utils/tokens/TokenUtils'
import { Token } from '../../utils/tokens/Token'
import { UNIV3_POOL_ABI } from '../../abi/uniV3/uniV3Pool'

export async function getPoolImmutables(
	poolAddress: Address,
	chainId: number,
): Promise<PoolImmutables> {
	const client = ClientManager.getClient(chainId)

	const contract = getContract({
		address: poolAddress,
		abi: UNIV3_POOL_ABI,
		client,
	})

	const [slot0Data, fee, token0Address, token1Address] = await Promise.all([
		contract.read.slot0(),
		contract.read.fee(),
		contract.read.token0(),
		contract.read.token1(),
	])

	const token0 = await TokenUtils.fromAddress<Token>(token0Address, chainId)
	const token1 = await TokenUtils.fromAddress<Token>(token1Address, chainId)

	return {
		token0,
		token1,
		fee,
		tickSpacing: slot0Data[1],
	}
}
