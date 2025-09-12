import { Injectable } from '@nestjs/common'
import { deflate } from 'pako'
import { getStargateChainKey } from '../bridges/layerzero-bridges/stargate/stargate.utils'
import { SOLANA_CHAIN_ID } from '../solana/solana-constants'
import { Graph } from './primitives/Graph'

@Injectable()
export class GraphVisualizer {
	getLinksToMermaidGraph(graph: Graph) {
		const mermaidCode = this.graphToMermaid(graph)

		return {
			view: this.generateViewLink(mermaidCode),
			edit: this.generateEditLink(mermaidCode),
		}
	}

	private generateViewLink(mermaidCode: string): string {
		return this.generateLink(mermaidCode, false)
	}

	private generateEditLink(mermaidCode: string): string {
		return this.generateLink(mermaidCode, true)
	}

	private generateLink(mermaidCode: string, isEdit: boolean): string {
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
	graphToMermaid(graph: Graph) {
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
			const { from, to } = edge

			const edgeLabel =
				edge.lastQuote === undefined
					? `|"${edge.constructor.name}" undefined|`
					: `|"${edge.constructor.name} ${edge.lastQuote.rate.toFixed(4)}"|`

			str += `\n\t${this.getNodeId(from.id)} --> ${edgeLabel} ${this.getNodeId(to.id)}`
		}

		return str
	}

	private getNodeId(graphNodeId: GraphNodeId) {
		return `Node_${graphNodeId.split(':').join('_')}`
	}

	private getChainId(chainId: number) {
		return `Chain_${chainId}`
	}

	private getChainName(chainId: number) {
		try {
			if (chainId === SOLANA_CHAIN_ID) {
				return 'Solana'
			}
			return getStargateChainKey(chainId) + ` (${chainId})`
		} catch (error) {
			return `Unnamed Chain (${chainId})`
		}
	}
}
