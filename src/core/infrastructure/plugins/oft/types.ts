import { TokenId } from '../../../domain/value-objects/token-id'

export interface OftGraphConfig {
	edges: {
		from: TokenId
		to: TokenId
	}[]
}
