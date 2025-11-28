import { TokenId } from '../../../domain/value-objects/token-id'

export type SimpleStargateGraphConfig = {
	edges: {
		from: TokenId
		to: TokenId
	}[]
}
