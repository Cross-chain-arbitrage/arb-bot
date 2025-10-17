import { QuotedStep } from '../../../../domain/value-objects/path'
import { StartRule } from './types'

export function getStartStepIndex(
	quotedStepSequence: QuotedStep[],
	startRules: StartRule[],
) {
	const tokenIdToIndexInSequence = new Map<string, number>(
		quotedStepSequence.map((step, index) => [
			step.edge.from.id.toLowerCase(),
			index,
		]),
	)

	const startRuleToApply = startRules.find(
		({ startTokenId, directionTokenId }) => {
			const startTokenIndex = tokenIdToIndexInSequence.get(
				startTokenId.toLowerCase(),
			)
			const directionTokenIndex = tokenIdToIndexInSequence.get(
				directionTokenId.toLowerCase(),
			)

			if (
				startTokenIndex === undefined ||
				directionTokenIndex === undefined
			)
				return false

			const startToDirectionDistance = findDistance(
				startTokenIndex,
				directionTokenIndex,
				quotedStepSequence.length,
			)

			const directionToStartDistance = findDistance(
				directionTokenIndex,
				startTokenIndex,
				quotedStepSequence.length,
			)

			if (startToDirectionDistance < directionToStartDistance) return true

			return false
		},
	)
	if (!startRuleToApply) return undefined

	const startStepIndex = tokenIdToIndexInSequence.get(
		startRuleToApply.startTokenId.toLowerCase(),
	)

	return startStepIndex
}
export function findDistance(
	fromIndex: number,
	toIndex: number,
	arrayLength: number,
) {
	if (toIndex >= fromIndex) return toIndex - fromIndex

	return arrayLength - fromIndex + toIndex
}
