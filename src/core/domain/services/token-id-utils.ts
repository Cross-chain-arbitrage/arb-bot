import { TokenId, tokenIdScheme } from '../value-objects/token-id'

export class TokenIdUtils {
	static parseId(tokenId: TokenId): {
		namespace: string
		reference: string
		address: string
	} {
		const tokenIdChecked = tokenIdScheme.parse(tokenId)

		const [namespace, reference, address] = tokenIdChecked.split(':')

		return { namespace, reference, address }
	}

	static generateId(
		namespace: string,
		reference: string,
		address: string,
	): TokenId {
		return `${namespace}:${reference}:${address}`
	}
}
