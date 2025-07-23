import { STARGATE_CHAINS } from './dumped/chains'

export function getStargateChainKey(chainId: number): string {
	const chain = STARGATE_CHAINS.find((chain) => chain.chainId === chainId)

	if (!chain) {
		throw new Error(
			`Chain with id ${chainId} not found in Stargate chain registry`,
		)
	}

	return chain.chainKey
}
