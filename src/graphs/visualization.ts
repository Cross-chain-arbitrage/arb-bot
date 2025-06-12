import { GraphNode } from './Graph'

export interface EdgeWithRate {
	rate: number
	from: GraphNode
	to: GraphNode
}

export function getMermaidGraph(edgesWithRate: Map<string, EdgeWithRate>) {
	let mermaidGraph = 'graph TD\n'

	for (const edge of edgesWithRate.values()) {
		mermaidGraph += `${edge.from.chainId}:${edge.from.symbol} -- ${edge.rate.toFixed(3)} --> ${edge.to.chainId}:${edge.to.symbol}\n`
	}

	return mermaidGraph
}
