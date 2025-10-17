import { QuotedPath as Path } from '../../../../domain/value-objects/arbitrage-cycle'
import { StartRule } from './types'

export function getStartStepIndex(path: Path, startRules: StartRule[]) {
	const tokenIdToIndexInPath = new Map<string, number>(
		path.map((step, index) => [step.edge.from.id.toLowerCase(), index]),
	)

	const startRuleToApply = startRules.find(
		({ startTokenId, directionTokenId }) => {
			const startTokenIndex = tokenIdToIndexInPath.get(
				startTokenId.toLowerCase(),
			)
			const directionTokenIndex = tokenIdToIndexInPath.get(
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
				path.length,
			)

			const directionToStartDistance = findDistance(
				directionTokenIndex,
				startTokenIndex,
				path.length,
			)

			if (startToDirectionDistance < directionToStartDistance) return true

			return false
		},
	)
	if (!startRuleToApply) return undefined

	const startStepIndex = tokenIdToIndexInPath.get(
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
