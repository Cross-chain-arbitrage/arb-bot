import { Edge } from '../../../domain/entities/edge'
import { Graph } from '../../../domain/entities/graph'
import { Node } from '../../../domain/entities/node'
import {
	EdgeQuoteProvider,
	EdgeQuoteProviderRegistry,
} from '../../interfaces/edge-quote-provider'
import { GraphPlugin } from '../../interfaces/graph-plugin'

export class GraphBuilder {
	constructor() {}

	async buildGraph(plugins: GraphPlugin[]): Promise<{
		graph: Graph
		edgeQuoteProviderRegistry: EdgeQuoteProviderRegistry
	}> {
		const graph = new Graph()

		for (const plugin of plugins) {
			if (plugin.discoverNodes) {
				const nodes = await plugin.discoverNodes()

				nodes.forEach((node) => {
					this.addNodeIfNotExists(graph, node)
				})
			}
		}

		for (const plugin of plugins) {
			const { nodes, edges } = await plugin.applyManual()

			nodes.forEach((node) => {
				this.addNodeIfNotExists(graph, node)
			})

			edges.forEach((edge) => {
				this.addEdgeIfNotExists(graph, edge)
			})
		}

		for (const plugin of plugins) {
			if (plugin.buildEdges) {
				const edges = await plugin.buildEdges(
					Array.from(graph.nodes.values()),
				)

				edges.forEach((edge) => {
					this.addEdgeIfNotExists(graph, edge)
				})
			}
		}

		const edgeQuoteProviderRegistry: EdgeQuoteProviderRegistry = {}

		for (const plugin of plugins) {
			for (const edge of graph.edges.values()) {
				const quoteFn = plugin.buildQuoteFn(edge)

				const edgeQuoteProvider: EdgeQuoteProvider = {
					edge: edge,
					buildGetQuoteFunction: quoteFn,
				}

				edgeQuoteProviderRegistry[edge.id] = edgeQuoteProvider
			}
		}

		return { graph, edgeQuoteProviderRegistry }
	}

	private addNodeIfNotExists(graph: Graph, node: Node) {
		const existingNode = graph.nodes.get(node.id)

		if (!existingNode) {
			graph.addNode(node)
		}
	}

	private addEdgeIfNotExists(graph: Graph, edge: Edge) {
		const existingEdge = graph.edges.get(edge.id)

		if (!existingEdge) {
			graph.addEdge(edge)
		}
	}
}
