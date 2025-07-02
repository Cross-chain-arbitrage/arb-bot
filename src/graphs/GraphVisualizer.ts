import { deflate } from 'pako'
import { Stargate } from '../bridges/stargate/Stargate'
import { Graph } from './primitives/Graph'

export class GraphVisualizer {
	static getLinksToMermaidGraph(graph: Graph) {
		const mermaidCode = this.graphToMermaid(graph)

		return {
			view: this.generateViewLink(mermaidCode),
			edit: this.generateEditLink(mermaidCode),
		}
	}

	static getPrettyOpportunity(
		opportunity: GraphArbitrageOpportunity,
		startTokenPriceUsd: number,
	) {
		const { path, startAmount, endAmount, profitAmount, profitPercentage } =
			opportunity

		// Get the start token from the first edge
		const startToken = path[0]?.from
		if (!startToken) throw new Error('Invalid opportunity: no path found')

		// Format amounts
		const startAmountFormatted = startToken.formatUnits(startAmount)
		const endAmountFormatted = startToken.formatUnits(endAmount)
		const profitAmountFormatted = startToken.formatUnits(profitAmount)

		const startUsd = Number(startAmountFormatted) * startTokenPriceUsd
		const endUsd = Number(endAmountFormatted) * startTokenPriceUsd

		let result = `👀 <b>Opportunity</b>\n\n`

		// Path summary
		result += `📊 <b>Path Summary</b>\n`
		result += `Start: $${startUsd.toFixed(2)} ${startAmountFormatted} ${startToken.toString()}\n`
		result += `End: $${endUsd.toFixed(2)} ${endAmountFormatted} ${startToken.toString()}\n`
		result += `Steps: ${path.length}\n\n`

		// Profit details
		result += `💰 <b>Profit Analysis</b>\n`
		result += `Profit USD: $${(Number(profitAmountFormatted) * startTokenPriceUsd).toFixed(2)}\n`
		result += `Profit: ${profitAmountFormatted} ${startToken.symbol}\n`
		result += `Profit %: ${profitPercentage.toFixed(2)}%\n\n`

		// Detailed path
		result += `🛣️ <b>Arbitrage Path</b>\n`

		// Vertical path format with italic actions
		for (let i = 0; i < path.length; i++) {
			const edge = path[i]
			result += `${edge.from.toString()}\n    │ ${edge.actionType.toLowerCase()}\n`
		}
		// Add the last node
		result += `${path[path.length - 1].to.toString()}\n\n`

		return result
	}

	private static generateViewLink(mermaidCode: string): string {
		return this.generateLink(mermaidCode, false)
	}

	private static generateEditLink(mermaidCode: string): string {
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
	/**
	 * Returns a Mermaid graph string with nodes and edges
	 * @param graph - Graph to convert to Mermaid
	 */
	static graphToMermaid(graph: Graph) {
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
			const subgraph = `\tsubgraph ${this.getChainId(chainId)}["${this.getChainName(chainId)}"]`
			str += `\n${subgraph}`

			for (const node of nodes) {
				str += `\n\t\t${this.getNodeId(node.id)}[${node.symbol}]`
			}

			str += `\n\tend`
		}

		for (const [, edge] of graph.edges) {
			const { from, to, actionType } = edge

			const edgeLabel =
				edge.lastQuote === undefined
					? `|"${actionType}"|`
					: `|"${actionType} ${edge.lastQuote.rate.toFixed(2)}"|`

			str += `\n\t${this.getNodeId(from.id)} --> ${edgeLabel} ${this.getNodeId(to.id)}`
		}

		return str
	}

	private static getNodeId(graphNodeId: GraphNodeId) {
		return `Node_${graphNodeId.split(':').join('_')}`
	}

	private static getChainId(chainId: number) {
		return `Chain_${chainId}`
	}

	private static getChainName(chainId: number) {
		try {
			return Stargate.getChainKey(chainId) + ` (${chainId})`
		} catch (error) {
			return `Unnamed Chain (${chainId})`
		}
	}
}
