import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'
import { TokenId } from '../../../../domain/value-objects/token-id'

export type PathRecoveryParams = {
	failedStepIndex: number
	originalPath: QuotedPath<Token>
	minTokenThresholds: Map<TokenId, number>
}
