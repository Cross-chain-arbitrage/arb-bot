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

			str += `\n\t${this.getNodeId(from.id)} --> |"${actionType}"| ${this.getNodeId(to.id)}`
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
