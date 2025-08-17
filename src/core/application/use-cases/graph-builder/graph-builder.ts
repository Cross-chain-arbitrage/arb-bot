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
		const edgeOwners: Record<
			EdgeId,
			GraphQuoteProviderPlugin & GraphBuilderPlugin
		> = {}

		const graph = await this.buildGraph(plugins, (edge, plugin) => {
			edgeOwners[edge.id] = plugin
		})

		const edgeQuoteProviderRegistry = this.buildQuoteProviderRegistry(
			graph,
			plugins,
			edgeOwners,
		)

		return { graph, edgeQuoteProviderRegistry }
	}

	async buildGraph<T extends GraphBuilderPlugin>(
		plugins: T[],
		onEdgeAdded: (edge: Edge, plugin: T) => void,
	): Promise<Graph> {
		const graph = new Graph()

		await this.addPossibleNodes(graph, plugins)

		await this.addDeterminedNodesAndEdges(graph, plugins, onEdgeAdded)

		// it's the last step because we need to define all nodes first
		await this.addPossibleEdges(graph, plugins, onEdgeAdded)

		return graph
	}

	buildQuoteProviderRegistry(
		graph: Graph,
		plugins: GraphQuoteProviderPlugin[],
		edgeOwners: Record<
			EdgeId,
			GraphQuoteProviderPlugin & GraphBuilderPlugin
		>,
	): EdgeQuoteProviderRegistry {
		const edgeQuoteProviderRegistry: EdgeQuoteProviderRegistry = {}

		plugins.forEach(() => {
			for (const edge of graph.edges.values()) {
				const edgeOwner = edgeOwners[edge.id]

				if (!edgeOwner) continue

				const edgeQuoteProvider = edgeOwner.buildEdgeQuoteProvider(edge)

				edgeQuoteProviderRegistry[edge.id] = edgeQuoteProvider
			}
		})

		return edgeQuoteProviderRegistry
	}

	private async addPossibleEdges<T extends GraphBuilderPlugin>(
		graph: Graph,
		plugins: T[],
		onEdgeAdded: (edge: Edge, plugin: T) => void,
	) {
		for (const plugin of plugins) {
			if (!plugin.findPossibleEdges) continue

			const edges = await plugin.findPossibleEdges(
				Array.from(graph.nodes.values()),
			)

			edges.forEach((edge) => {
				if (this.addEdgeIfNotExists(graph, edge)) {
					onEdgeAdded(edge, plugin)
				}
			})
		}
	}

	private async addDeterminedNodesAndEdges<T extends GraphBuilderPlugin>(
		graph: Graph,
		plugins: T[],
		onEdgeAdded: (edge: Edge, plugin: T) => void,
	) {
		for (const plugin of plugins) {
			if (!plugin.getDeterminedNodesAndEdges) continue
			const { nodes, edges } = await plugin.getDeterminedNodesAndEdges()

			nodes.forEach((node) => {
				this.addNodeIfNotExists(graph, node)
			})

			edges.forEach((edge) => {
				if (this.addEdgeIfNotExists(graph, edge)) {
					onEdgeAdded(edge, plugin)
				}
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
			return true
		}

		return false
	}

	private addEdgeIfNotExists(graph: Graph, edge: Edge) {
		const existingEdge = graph.edges.get(edge.id)

		if (!existingEdge) {
			graph.addEdge(edge)
			return true
		}

		return false
	}
}
