import { ChainId } from '../value-objects/chain-id'
import { TokenId, tokenIdScheme } from '../value-objects/token-id'

export class TokenIdUtils {
	static parseId(tokenId: TokenId): {
		chainId: ChainId
		address: string
	} {
		const tokenIdChecked = tokenIdScheme.parse(tokenId)

		const [namespace, reference, address] = tokenIdChecked.split(':')

		return { chainId: `${namespace}:${reference}`, address }
	}

	static generateId(chainId: ChainId, address: string): TokenId {
		return `${chainId}:${address}`.toLowerCase() as TokenId
	}
}
