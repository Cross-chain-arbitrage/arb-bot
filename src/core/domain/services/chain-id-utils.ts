import { ChainId, chainIdScheme } from '../value-objects/chain-id'

export class ChainIdUtils {
	static parseId(chainId: ChainId): {
		namespace: string
		reference: string
	} {
		const chainIdChecked = chainIdScheme.parse(chainId)

		const [namespace, reference] = chainIdChecked.split(':')

		return { namespace, reference }
	}

	static generateId(namespace: string, reference: string): ChainId {
		return `${namespace}:${reference}`
	}
}
