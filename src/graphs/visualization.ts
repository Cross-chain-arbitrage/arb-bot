import { Stargate } from '../bridges/stargate/Stargate'
import { Graph, GraphNode, GraphNodeId } from './Graph'

export interface EdgeWithRate {
	rate: number
	from: GraphNode
	to: GraphNode
}

/**
 * Returns a Mermaid graph string with edges and rates
 * @param edgesWithRate - Map of edges with rates, returned by `findArbitragePath()`
 */
export function getMermaidGraph(edgesWithRate: Map<string, EdgeWithRate>) {
	let mermaidGraph = 'graph TD\n'

	for (const edge of edgesWithRate.values()) {
		mermaidGraph += `${edge.from.chainId}:${edge.from.symbol} -- ${edge.rate.toFixed(3)} --> ${edge.to.chainId}:${edge.to.symbol}\n`
	}

	return mermaidGraph
}

/**
 * Returns a Mermaid graph string with nodes and edges
 * @param graph - Graph to convert to Mermaid
 */
export function graphToMermaid(graph: Graph) {
	let str = `flowchart TB`
	const nodesBySubgraph = new Map<number, GraphNode[]>()

	for (const node of graph.nodes.values()) {
		const subgraph = nodesBySubgraph.get(node.chainId)

		if (!subgraph) {
			nodesBySubgraph.set(node.chainId, [node])
			continue
		}

		subgraph.push(node)
	}

	for (const [chainId, nodes] of nodesBySubgraph) {
		const subgraph = `\tsubgraph ${getChainId(chainId)}["${getChainName(chainId)}"]`
		str += `\n${subgraph}`

		for (const node of nodes) {
			str += `\n\t\t${getNodeId(node.id)}[${node.symbol}]`
		}

		str += `\n\tend`
	}

	for (const edge of graph.edges) {
		str += `\n\t${getNodeId(edge.from)} --> |"${edge.type}"| ${getNodeId(edge.to)}`
	}

	console.log(str)
}

function getNodeId(graphNodeId: GraphNodeId) {
	return `Node_${graphNodeId.split(':').join('_')}`
}

function getChainId(chainId: number) {
	return `Chain_${chainId}`
}

function getChainName(chainId: number) {
	try {
		return Stargate.getChainKey(chainId) + ` (${chainId})`
	} catch (error) {
		return `Unnamed Chain (${chainId})`
	}
}
