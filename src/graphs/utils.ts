import { Stargate } from '../bridges/stargate/Stargate'
import { GeckoTerminalAPI } from '../data-apis/geckoterminal/GeckoTerminalAPI'
import { Graph, GraphNode, GraphNodeId } from './Graph'
import { ArbitragePath } from './path'
import { EdgeWithRate, getMermaidGraph } from './visualization'

export async function prettyPrintPath(
	startToken: GraphNode,
	startAmount: bigint,
	path: ArbitragePath | null,
	edgesWithRate: Map<string, EdgeWithRate>,
) {
	if (!path) {
		console.log('No arbitrage path found')

		const mermaidGraph = getMermaidGraph(edgesWithRate)

		console.log(mermaidGraph)
		return
	}

	console.log('\n=================== Path ===================\n')

	path.edges.forEach((edge) => {
		console.log(`${edge.from} -- ${edge.type} --> ${edge.to}`)
	})

	console.log('\n=================== Values ===================\n')

	const priceETH = await GeckoTerminalAPI.getTokenPriceETH()

	console.log(
		'Start amount',
		Number(startToken.formatUnits(startAmount)).toFixed(4),
		startToken.symbol,
		`($${(priceETH * Number(startToken.formatUnits(startAmount))).toFixed(2)})`,
	)

	console.log(
		'End amount',
		Number(startToken.formatUnits(path.endAmount)).toFixed(4),
		`($${(priceETH * Number(startToken.formatUnits(path.endAmount))).toFixed(2)})`,
	)

	console.log(
		'Profit amount',
		startToken.formatUnits(path.profitAmount),
		`($${(priceETH * Number(startToken.formatUnits(path.profitAmount))).toFixed(2)})`,
	)
	console.log('Profit percentage', `${path.profitPercentage.toFixed(2)}%`)
}

export function printGraph(graph: Graph) {
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
