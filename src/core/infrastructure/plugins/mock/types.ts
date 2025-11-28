import { TokenId } from '../../../domain/value-objects/token-id'

export type MockGraphConfig = {
	edges?: Array<{ from: TokenId; to: TokenId }>
}
