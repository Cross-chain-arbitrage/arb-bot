import { TokenId } from '../../../domain/value-objects/token-id'

export type RelayGraphConfig = {
	edges: {
		from: TokenId
		to: TokenId
	}[]
}
