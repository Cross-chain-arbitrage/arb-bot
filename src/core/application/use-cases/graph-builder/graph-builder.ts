import { Edge } from '../../../domain/entities/edge'
import { Graph } from '../../../domain/entities/graph'
import { Node } from '../../../domain/entities/node'
import { EdgeQuoteProviderRegistry } from '../../interfaces/edge-quote-provider'
import {
	GraphBuilderPlugin,
	GraphQuoteProviderPlugin,
} from '../../interfaces/graph-plugin'

export class GraphBuilder {
	constructor() {}

	async buildGraphWithQuoteProviders(
		plugins: (GraphBuilderPlugin & GraphQuoteProviderPlugin)[],
	): Promise<{
		graph: Graph
		edgeQuoteProviderRegistry: EdgeQuoteProviderRegistry
	}> {
		const graph = await this.buildGraph(plugins)

		const edgeQuoteProviderRegistry = this.buildQuoteProviderRegistry(
			graph,
			plugins,
		)

		return { graph, edgeQuoteProviderRegistry }
	}

	async buildGraph(plugins: GraphBuilderPlugin[]): Promise<Graph> {
		const graph = new Graph()

		await this.addPossibleNodes(graph, plugins)

		await this.addDeterminedNodesAndEdges(graph, plugins)

		// it's the last step because we need to define all nodes first
		await this.addPossibleEdges(graph, plugins)

		return graph
	}

	buildQuoteProviderRegistry(
		graph: Graph,
		plugins: GraphQuoteProviderPlugin[],
	): EdgeQuoteProviderRegistry {
		const edgeQuoteProviderRegistry: EdgeQuoteProviderRegistry = {}

		for (const plugin of plugins) {
			for (const edge of graph.edges.values()) {
				// TODO: fix bag with creating quote providers for edges not from its plugin
				const edgeQuoteProvider = plugin.buildEdgeQuoteProvider(edge)

				edgeQuoteProviderRegistry[edge.id] = edgeQuoteProvider
			}
		}

		return edgeQuoteProviderRegistry
	}

	private async addPossibleEdges(
		graph: Graph,
		plugins: GraphBuilderPlugin[],
	) {
		for (const plugin of plugins) {
			if (!plugin.findPossibleEdges) continue

			const edges = await plugin.findPossibleEdges(
				Array.from(graph.nodes.values()),
			)

			edges.forEach((edge) => {
				this.addEdgeIfNotExists(graph, edge)
			})
		}
	}

	private async addDeterminedNodesAndEdges(
		graph: Graph,
		plugins: GraphBuilderPlugin[],
	) {
		for (const plugin of plugins) {
			if (!plugin.getDeterminedNodesAndEdges) continue
			const { nodes, edges } = await plugin.getDeterminedNodesAndEdges()

			nodes.forEach((node) => {
				this.addNodeIfNotExists(graph, node)
			})

			edges.forEach((edge) => {
				this.addEdgeIfNotExists(graph, edge)
			})
		}
	}

	private async addPossibleNodes(
		graph: Graph,
		plugins: GraphBuilderPlugin[],
	) {
		for (const plugin of plugins) {
			if (!plugin.findPossibleNodes) continue

			const nodes = await plugin.findPossibleNodes()

			nodes.forEach((node) => {
				this.addNodeIfNotExists(graph, node)
			})
		}
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
