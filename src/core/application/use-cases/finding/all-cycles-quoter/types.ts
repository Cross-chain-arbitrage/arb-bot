import { TokenId } from '../../../../domain/value-objects/token-id'

export type AllCyclesQuoterConfig = {
	startTokenId: TokenId
	delayBetweenPathsMs: number
	startAmount: number
}
