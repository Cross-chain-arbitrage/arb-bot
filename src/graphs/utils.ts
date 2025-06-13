import { GeckoTerminalAPI } from '../data-apis/geckoterminal/GeckoTerminalAPI'
import { GraphNode } from './Graph'
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
		console.log(
			`${edge.from.symbol} (${edge.from.chainId}) -- ${edge.type} --> ${edge.to.symbol} (${edge.to.chainId})`,
		)
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
