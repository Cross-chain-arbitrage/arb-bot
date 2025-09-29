import { GraphArbitrageOpportunity } from '../../finding/snapshot-opportunity-finder/types'
import { StartRule } from './types'

export function getStartStepIndex(
	opportunity: GraphArbitrageOpportunity,
	startRules: StartRule[],
) {
	const tokenIdToIndexInPath = new Map<string, number>(
		opportunity.path.map((step, index) => [
			step.edge.from.id.toLowerCase(),
			index,
		]),
	)

	const startRuleToApply = startRules.find(
		({ startTokenId, directionTokenId }) => {
			const startTokenIndex = tokenIdToIndexInPath.get(
				startTokenId.toLowerCase(),
			)
			const directionTokenIndex = tokenIdToIndexInPath.get(
				directionTokenId.toLowerCase(),
			)

			if (!startTokenIndex || !directionTokenIndex) return false

			const startToDirectionDistance = findDistance(
				startTokenIndex,
				directionTokenIndex,
				opportunity.path.length,
			)

			const directionToStartDistance = findDistance(
				directionTokenIndex,
				startTokenIndex,
				opportunity.path.length,
			)

			if (startToDirectionDistance < directionToStartDistance) return true

			return false
		},
	)
	if (!startRuleToApply) return undefined

	const startStepIndex = tokenIdToIndexInPath.get(
		startRuleToApply.startTokenId,
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
