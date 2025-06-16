import { GeckoTerminalAPI } from '../data-apis/geckoterminal/GeckoTerminalAPI'
import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { WrappedNative } from '../primitives/tokens/WrappedNative'
import { GraphEdge } from './Graph'
import { ArbitragePath } from './path'
import { EdgeWithRate, getMermaidGraph } from './visualization'

export async function prettyPrintPath(
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

	const startToken = await TokenUtils.fromId(path.edges[0].from)

	for (const edge of path.edges) {
		const { from, to } = await getEdgeNodes(edge)
		console.log(`${from.toString()} -- ${edge.type} --> ${to.toString()}`)
	}

	console.log('\n=================== Values ===================\n')

	const priceETH = await GeckoTerminalAPI.getTokenPriceETH()

	console.log(
		'Start amount',
		Number(startToken.formatUnits(path.startAmount)).toFixed(4),
		startToken.symbol,
		`($${(priceETH * Number(startToken.formatUnits(path.startAmount))).toFixed(2)})`,
	)

	console.log(
		'End amount',
		Number(startToken.formatUnits(path.endAmount)).toFixed(4),
		startToken.symbol,
		`($${(priceETH * Number(startToken.formatUnits(path.endAmount))).toFixed(2)})`,
	)

	console.log(
		'Profit amount',
		startToken.formatUnits(path.profitAmount),
		`($${(priceETH * Number(startToken.formatUnits(path.profitAmount))).toFixed(2)})`,
	)
	console.log('Profit percentage', `${path.profitPercentage.toFixed(2)}%`)
}

// TODO: move this logic to Edge or Graph
/**
 * Workaround to having to pass Graph around to get the nodes of an edge
 * @param edge - The edge to get the nodes of
 * @returns The nodes of the edge
 * @dev This is a workaround applies logical overhead cos of Promise usage,
 * when it's definitely possible to get nodes synchronously
 */
export async function getEdgeNodes(edge: GraphEdge): Promise<{
	from: Token | WrappedNative | NativeCurrency
	to: Token | WrappedNative | NativeCurrency
}> {
	const { from, to } = edge

	const fromToken = await TokenUtils.fromId(from)
	const toToken = await TokenUtils.fromId(to)

	return {
		from: fromToken,
		to: toToken,
	}
}
