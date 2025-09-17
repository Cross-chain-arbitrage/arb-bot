import { TokenId } from '../../../domain/value-objects/token-id'

export type RelayConfig = {
	edges: {
		from: TokenId
		to: TokenId
	}[]
}
