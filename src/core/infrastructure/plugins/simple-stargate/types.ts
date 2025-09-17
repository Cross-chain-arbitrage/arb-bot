import { TokenId } from '../../../domain/value-objects/token-id'

export type SimpleStargateConfig = {
	edges: {
		from: TokenId
		to: TokenId
	}[]
}
