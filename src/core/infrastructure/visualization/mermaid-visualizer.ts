import { Injectable } from '@nestjs/common'
import { deflate } from 'pako'
import { isAddress } from 'viem'
import { GraphVisualizer } from '../../application/interfaces/graph-visualizer'
import { Edge } from '../../domain/entities/edge'
import { Graph } from '../../domain/entities/graph'
import { ChannelIdUtils } from '../../domain/services/channel-id-utils'
import { EdgeIdUtils } from '../../domain/services/edge-id-utils'
import { TokenId } from '../../domain/value-objects/token-id'
import { shortenAddress } from '../evm/helpers'

interface VisualizableNode {
	id: TokenId
	symbol: string
	chainId?: number | string
}

@Injectable()
export class MermaidVisualizer implements GraphVisualizer {
	getLinkToGraph(graph: Graph<VisualizableNode>) {
		const mermaidCode = this.graphToMermaid(graph)

		return this.generateViewLink(mermaidCode)
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
	 */
	graphToMermaid(graph: Graph<VisualizableNode>) {
		let str = `flowchart TB`
		const nodesBySubgraph = new Map<string, VisualizableNode[]>()

		for (const node of graph.nodes.values()) {
			const subgraph = nodesBySubgraph.get(this.getSubgraphId(node))

			if (!subgraph) {
				nodesBySubgraph.set(this.getSubgraphId(node), [node])
				continue
			}

			subgraph.push(node)
		}

		for (const [subgraphId, nodes] of nodesBySubgraph) {
			const subgraph = `\tsubgraph ${subgraphId}["${subgraphId}"]`
			str += `\n${subgraph}`

			for (const node of nodes) {
				str += `\n\t\t${this.getNodeId(node.id)}[${node.symbol}]`
			}

			str += `\n\tend`
		}

		for (const [, edge] of graph.edges) {
			const { from, to } = edge as Edge<VisualizableNode>

			const channelId = EdgeIdUtils.parseId(edge.id).channelId
			const { protocol, instance } = ChannelIdUtils.parseId(channelId)

			const isInstanceAddress = isAddress(instance)

			const edgeLabel = `|"${protocol}${isInstanceAddress ? ` ${shortenAddress(instance)}` : ''}"|`

			str += `\n\t${this.getNodeId(from.id)} --> ${edgeLabel} ${this.getNodeId(to.id)}`
		}

		return str
	}

	private getNodeId(tokenId: TokenId) {
		return `Node_${tokenId.split(':').join('_')}`
	}

	private getSubgraphId(node: VisualizableNode) {
		if (!node.chainId) {
			return 'Unknown Subgraph'
		}

		return `Chain_${node.chainId}`
	}
}
