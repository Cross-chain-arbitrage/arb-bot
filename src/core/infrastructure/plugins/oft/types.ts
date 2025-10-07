import { TokenId } from '../../../domain/value-objects/token-id'

export interface OftConfig {
	edges: {
		from: TokenId
		to: TokenId
	}[]
}
