import { CHAIN_KEYS } from "./chains"

export function getChainKey(chainId: number): string {
	const chain = CHAIN_KEYS.find((chain) => chain.chainId === chainId)
	if (!chain) {
		throw new Error(
			`Chain with id ${chainId} not found in Stargate chain registry`,
		)
	}
	return chain.chainKey
}
