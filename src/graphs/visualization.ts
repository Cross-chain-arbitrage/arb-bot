import { deflate } from 'pako'
import { Stargate } from '../bridges/stargate/Stargate'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { EdgeWithRate, Graph, GraphNode, GraphNodeId } from './Graph'
import { ArbitragePath } from './path'
import { getEdgeNodes } from './utils'

/**
 * Returns a Mermaid graph string with edges and rates
 * @param edgesWithRate - Map of edges with rates, returned by `findArbitragePath()`
 */
export async function getMermaidGraph(
	edgesWithRate: Map<string, EdgeWithRate>,
) {
	let mermaidGraph = 'graph TD\n'

	for (const edge of edgesWithRate.values()) {
		const { from, to } = await getEdgeNodes(edge)
		mermaidGraph += `${from.chainId}:${from.symbol} -- ${edge.rate.toFixed(3)} --> ${to.chainId}:${to.symbol}\n`
	}

	return mermaidGraph
}

export class MermaidLinkGenerator {
	static generateViewLink(mermaidCode: string): string {
		return this.generateLink(mermaidCode, false)
	}

	static generateEditLink(mermaidCode: string): string {
		return this.generateLink(mermaidCode, true)
	}

	private static generateLink(mermaidCode: string, isEdit: boolean): string {
		// Create the proper JSON structure
		const graphData = {
			code: mermaidCode,
			mermaid: { theme: 'default' },
		}

		// Convert to bytes and compress with pako
		const jsonString = JSON.stringify(graphData)
		const compressed = deflate(jsonString)

		// Convert to base64 and make URL-safe
		const base64 = Buffer.from(compressed)
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')

		const endpoint = isEdit ? 'edit' : 'view'
		return `https://mermaid.live/${endpoint}#pako:${base64}`
	}
}

export function getLinksToMermaidGraph(graph: Graph) {
	const mermaidCode = graphToMermaid(graph)
	return {
		view: MermaidLinkGenerator.generateViewLink(mermaidCode),
		edit: MermaidLinkGenerator.generateEditLink(mermaidCode),
	}
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

	return str
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

export async function getPrettyPath(
	path: ArbitragePath | null,
	edgesWithRate: Map<string, EdgeWithRate>,
	startTokenPrice: number,
) {
	let prettyPath = ''

	if (!path) {
		prettyPath += 'No arbitrage path found'

		const mermaidGraph = await getMermaidGraph(edgesWithRate)

		prettyPath += `\n\n${mermaidGraph}`

		return prettyPath
	}

	prettyPath += '\n=================== Path ===================\n'

	const startToken = await TokenUtils.fromId(path.edges[0].from)

	for (const edge of path.edges) {
		const { from, to } = await getEdgeNodes(edge)
		prettyPath += `${from.toString()} -- ${edge.type} --> ${to.toString()}\n`
	}

	prettyPath += '\n=================== Values ===================\n'

	prettyPath += `Start amount ${Number(startToken.formatUnits(path.startAmount)).toFixed(4)} ${startToken.symbol} ($${(startTokenPrice * Number(startToken.formatUnits(path.startAmount))).toFixed(2)})\n`

	prettyPath += `End amount ${Number(startToken.formatUnits(path.endAmount)).toFixed(4)} ${startToken.symbol} ($${(startTokenPrice * Number(startToken.formatUnits(path.endAmount))).toFixed(2)})\n`

	prettyPath += `Profit amount ${startToken.formatUnits(path.profitAmount)} ($${(startTokenPrice * Number(startToken.formatUnits(path.profitAmount))).toFixed(2)})\n`
	prettyPath += `Profit percentage ${path.profitPercentage.toFixed(2)}%\n`

	return prettyPath
}
