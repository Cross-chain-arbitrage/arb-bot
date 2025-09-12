import { Injectable, Logger } from '@nestjs/common'
import { Edge } from '../../../domain/entities/edge'
import { Graph } from '../../../domain/entities/graph'
import { Node } from '../../../domain/entities/node'
import { EdgeExecutorRegistry } from '../../interfaces/edge-executor'
import { EdgeSnapshotBuilderRegistry } from '../../interfaces/edge-snapshot-builder'
import {
	EdgeHandlerPlugin,
	ExecutorPlugin,
	GraphPlugin,
	SnapshotPlugin,
} from '../../interfaces/graph-plugin'

@Injectable()
export class GraphBuilder {
	private readonly logger = new Logger(GraphBuilder.name)

	constructor() {}

	async buildGraph(plugins: GraphPlugin[]): Promise<Graph> {
		const graph = new Graph()

		await this.addPossibleNodes(graph, plugins)

		await this.addDeterminedNodesAndEdges(graph, plugins)

		// it's the last step because we need to define all nodes first
		await this.addPossibleEdges(graph, plugins)

		return graph
	}

	async buildExecutorRegistry(
		graph: Graph,
		plugins: ExecutorPlugin[],
	): Promise<EdgeExecutorRegistry> {
		const edgeExecutorRegistry: EdgeExecutorRegistry = new Map()

		for (const edge of graph.edges.values()) {
			const pluginCanHandle = await this.getPluginCanHandle(edge, plugins)

			const edgeExecutorProvider =
				await pluginCanHandle.buildEdgeExecutor(edge)

			edgeExecutorRegistry.set(edge.id, edgeExecutorProvider)
		}

		return edgeExecutorRegistry
	}
	async getPluginCanHandle<T extends EdgeHandlerPlugin>(
		edge: Edge,
		plugins: T[],
	): Promise<T> {
		let pluginCanHandleCount = 0
		let pluginCanHandle: T | undefined

		await Promise.all(
			plugins.map(async (plugin) => {
				const canHandle = await plugin.canHandle(edge)

				if (canHandle) {
					pluginCanHandleCount++
					pluginCanHandle = plugin
				}
			}),
		)

		if (!pluginCanHandle) throw new Error(`No plugin can handle ${edge.id}`)

		if (pluginCanHandleCount > 1)
			throw new Error(`Multiple plugins can handle ${edge.id}`)

		return pluginCanHandle
	}

	async buildSnapshotBuilderRegistry(
		graph: Graph,
		plugins: SnapshotPlugin[],
	): Promise<EdgeSnapshotBuilderRegistry> {
		const edgeSnapshotBuilderRegistry: EdgeSnapshotBuilderRegistry =
			new Map()

		for (const edge of graph.edges.values()) {
			const pluginCanHandle = await this.getPluginCanHandle(edge, plugins)

			const edgeQuoteProvider =
				await pluginCanHandle.buildEdgeSnapshotBuilder(edge)

			edgeSnapshotBuilderRegistry.set(edge.id, edgeQuoteProvider)
		}

		return edgeSnapshotBuilderRegistry
	}

	private async addPossibleEdges(graph: Graph, plugins: GraphPlugin[]) {
		for (const plugin of plugins) {
			if (!plugin.findPossibleEdges) continue

			this.logger.log(
				`Finding possible edges for ${plugin.constructor.name}`,
			)

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
		plugins: GraphPlugin[],
	) {
		for (const plugin of plugins) {
			if (!plugin.getDeterminedNodesAndEdges) continue

			this.logger.log(
				`Getting determined nodes and edges for ${plugin.constructor.name}`,
			)

			const { nodes, edges } = await plugin.getDeterminedNodesAndEdges()

			nodes.forEach((node) => {
				this.addNodeIfNotExists(graph, node)
			})

			edges.forEach((edge) => {
				this.addEdgeIfNotExists(graph, edge)
			})
		}
	}

	private async addPossibleNodes(graph: Graph, plugins: GraphPlugin[]) {
		for (const plugin of plugins) {
			if (!plugin.findPossibleNodes) continue

			this.logger.log(
				`Finding possible nodes for ${plugin.constructor.name}`,
			)

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
