import { TokenId } from '../../../domain/value-objects/token-id'

export type MockConfig = {
	edges?: Array<{ from: TokenId; to: TokenId }>
}
