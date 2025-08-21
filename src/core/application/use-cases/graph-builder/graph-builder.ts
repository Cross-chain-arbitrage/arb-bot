import { Injectable, Logger } from '@nestjs/common'
import { Edge } from '../../../domain/entities/edge'
import { Graph } from '../../../domain/entities/graph'
import { Node } from '../../../domain/entities/node'
import { EdgeExecutorRegistry } from '../../interfaces/edge-executor'
import { EdgeSnapshotBuilderRegistry } from '../../interfaces/edge-snapshot-builder'
import {
	ExecutorPlugin,
	GraphPlugin,
	SnapshotPlugin,
} from '../../interfaces/graph-plugin'
import { GraphWithEdgeOwners, PluginId } from './types'

@Injectable()
export class GraphBuilder {
	private readonly logger = new Logger(GraphBuilder.name)

	constructor() {}

	async buildGraphWithEdgeOwners(
		plugins: GraphPlugin[],
	): Promise<GraphWithEdgeOwners> {
		const edgeOwners: Record<EdgeId, PluginId> = {}

		const graph = await this.buildGraph(plugins, (edge, plugin) => {
			edgeOwners[edge.id] = plugin.id
		})

		return { graph, edgeOwners }
	}

	async buildGraph(
		plugins: GraphPlugin[],
		onEdgeAdded: (edge: Edge, plugin: GraphPlugin) => void,
	): Promise<Graph> {
		const graph = new Graph()

		await this.addPossibleNodes(graph, plugins)

		await this.addDeterminedNodesAndEdges(graph, plugins, onEdgeAdded)

		// it's the last step because we need to define all nodes first
		await this.addPossibleEdges(graph, plugins, onEdgeAdded)

		return graph
	}

	buildExecutorRegistry(
		graph: Graph,
		plugins: ExecutorPlugin[],
		edgeOwners: Record<EdgeId, PluginId>,
	): EdgeExecutorRegistry {
		const edgeExecutorRegistry: EdgeExecutorRegistry = {}

		plugins.forEach(() => {
			for (const edge of graph.edges.values()) {
				const pluginId = edgeOwners[edge.id]

				const plugin = plugins.find((p) => p.id === pluginId)

				if (!plugin) throw new Error(`Plugin ${pluginId} not found`)

				const edgeActionProvider = plugin.buildEdgeExecutor(edge)

				edgeExecutorRegistry[edge.id] = edgeActionProvider
			}
		})

		return edgeExecutorRegistry
	}

	buildSnapshotBuilderRegistry(
		graph: Graph,
		plugins: SnapshotPlugin[],
		edgeOwners: Record<EdgeId, PluginId>,
	): EdgeSnapshotBuilderRegistry {
		const edgeSnapshotBuilderRegistry: EdgeSnapshotBuilderRegistry = {}

		plugins.forEach(() => {
			for (const edge of graph.edges.values()) {
				const pluginId = edgeOwners[edge.id]

				const plugin = plugins.find((p) => p.id === pluginId)

				if (!plugin) throw new Error(`Plugin ${pluginId} not found`)

				const edgeQuoteProvider = plugin.buildEdgeSnapshotBuilder(edge)

				edgeSnapshotBuilderRegistry[edge.id] = edgeQuoteProvider
			}
		})

		return edgeSnapshotBuilderRegistry
	}

	private async addPossibleEdges(
		graph: Graph,
		plugins: GraphPlugin[],
		onEdgeAdded: (edge: Edge, plugin: GraphPlugin) => void,
	) {
		for (const plugin of plugins) {
			if (!plugin.findPossibleEdges) continue

			this.logger.log(`Finding possible edges for plugin ${plugin.id}`)

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

	private async addDeterminedNodesAndEdges(
		graph: Graph,
		plugins: GraphPlugin[],
		onEdgeAdded: (edge: Edge, plugin: GraphPlugin) => void,
	) {
		for (const plugin of plugins) {
			if (!plugin.getDeterminedNodesAndEdges) continue

			this.logger.log(
				`Getting determined nodes and edges for plugin ${plugin.id}`,
			)

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

	private async addPossibleNodes(graph: Graph, plugins: GraphPlugin[]) {
		for (const plugin of plugins) {
			if (!plugin.findPossibleNodes) continue

			this.logger.log(`Finding possible nodes for plugin ${plugin.id}`)

			const nodes = await plugin.findPossibleNodes()

			nodes.forEach((node) => {
				this.addNodeIfNotExists(graph, node)
			})
		}
	}

	private addNodeIfNotExists(graph: Graph, node: Node) {
		const existingNode = graph.nodes.get(node.id)

		if (!existingNode) {
			this.logger.log(`Adding node ${node.id}`)

			graph.addNode(node)

			return true
		}

		return false
	}

	private addEdgeIfNotExists(graph: Graph, edge: Edge) {
		const existingEdge = graph.edges.get(edge.id)

		if (!existingEdge) {
			this.logger.log(`Adding edge ${edge.id}`)

			graph.addEdge(edge)

			return true
		}

		return false
	}
}
