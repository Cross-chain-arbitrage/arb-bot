import { createCustomError } from '../../../utils/common'
import { Edge } from '../entities/edge'
import { Node, NodeId } from '../entities/node'
import { QuotedPath, QuotedStep } from '../value-objects/path'
import { Quote } from '../value-objects/quote'
import { GraphSnapshot } from '../value-objects/weighted-graph-snapshot'

const BellmanFordError = createCustomError('BellmanFordError')

type BellmanFordState = {
	distances: Map<NodeId, number>
	predecessors: Map<NodeId, Edge>
	amounts: Map<NodeId, bigint>
}

export class BellmanFord {
	static findNegativeSumCycle(
		startNode: Node,
		startAmount: bigint,
		graphSnapshot: GraphSnapshot,
	): QuotedPath | null {
		const state = this.initializeState(startNode, startAmount)

		const cycle = this.runBellmanFordForCycle(
			startNode,
			startAmount,
			graphSnapshot,
			state,
		)

		return cycle
	}

	static findPath(
		startNode: Node,
		endNode: Node,
		startAmount: bigint,
		graphSnapshot: GraphSnapshot,
	): QuotedPath | null {
		if (startNode.id === endNode.id) {
			return {
				quotedStepSequence: [],
				startAmount,
				endAmount: startAmount,
			}
		}

		const state = this.initializeState(startNode, startAmount)

		this.runBellmanFordRelaxation(graphSnapshot, state)

		if (!state.distances.has(endNode.id)) {
			return null
		}

		return this.reconstructPath(state, endNode, startAmount, graphSnapshot)
	}

	private static initializeState(
		startNode: Node,
		startAmount: bigint,
	): BellmanFordState {
		const distances = new Map<NodeId, number>()
		const predecessors = new Map<NodeId, Edge>()
		const amounts = new Map<NodeId, bigint>()

		distances.set(startNode.id, 0)
		amounts.set(startNode.id, startAmount)

		return { distances, predecessors, amounts }
	}

	private static runBellmanFordForCycle(
		startNode: Node,
		startAmount: bigint,
		graphSnapshot: GraphSnapshot,
		state: BellmanFordState,
	): QuotedPath | null {
		const { graph } = graphSnapshot
		const { distances, predecessors, amounts } = state

		for (let i = 0; i < graph.nodes.size; i++) {
			const quotes = this.collectQuotes(graphSnapshot, state)

			for (const { quote, edge } of quotes) {
				const fromDistance = distances.get(edge.from.id)
				if (fromDistance === undefined) continue

				const newDist = fromDistance + quote.negativeLogRate
				const toDistance = distances.get(edge.to.id) ?? Infinity

				if (newDist < toDistance) {
					distances.set(edge.to.id, newDist)
					predecessors.set(edge.to.id, edge)
					amounts.set(edge.to.id, quote.amountOut)

					const isCyclic = edge.to.id === startNode.id
					const isNegative = newDist < 0

					if (isCyclic && isNegative) {
						return this.reconstructCycle(
							predecessors,
							startNode,
							startAmount,
							graphSnapshot,
						)
					}
				}
			}
		}

		return null
	}

	private static runBellmanFordRelaxation(
		graphSnapshot: GraphSnapshot,
		state: BellmanFordState,
	): void {
		const { graph } = graphSnapshot
		const { distances, predecessors, amounts } = state

		for (let i = 0; i < graph.nodes.size - 1; i++) {
			const quotes = this.collectQuotes(graphSnapshot, state)

			for (const { quote, edge } of quotes) {
				const fromDistance = distances.get(edge.from.id)
				if (fromDistance === undefined) continue

				const newDist = fromDistance + quote.negativeLogRate
				const toDistance = distances.get(edge.to.id) ?? Infinity

				if (newDist < toDistance) {
					distances.set(edge.to.id, newDist)
					predecessors.set(edge.to.id, edge)
					amounts.set(edge.to.id, quote.amountOut)
				}
			}
		}
	}

	private static collectQuotes(
		graphSnapshot: GraphSnapshot,
		state: BellmanFordState,
	): { quote: Quote; edge: Edge }[] {
		const { graph } = graphSnapshot
		const { amounts, distances } = state
		const quotes: { quote: Quote; edge: Edge }[] = []

		for (const [, edge] of graph.edges) {
			const currentAmount = amounts.get(edge.from.id)
			const fromDistance = distances.get(edge.from.id)

			if (!currentAmount || fromDistance === undefined) continue

			const quote = graphSnapshot.getQuote(edge.id, currentAmount)
			quotes.push({ quote, edge })
		}

		return quotes
	}

	private static reconstructCycle(
		predecessors: Map<NodeId, Edge>,
		startNode: Node,
		startAmount: bigint,
		graphSnapshot: GraphSnapshot,
	): QuotedPath {
		const edges = this.collectCycleEdges(predecessors, startNode)
		const quotedSteps = this.calculateQuotedSteps(
			edges,
			startAmount,
			graphSnapshot,
		)

		const endAmount =
			quotedSteps[quotedSteps.length - 1]?.quote.amountOut ?? startAmount

		return {
			quotedStepSequence: quotedSteps,
			startAmount,
			endAmount,
		}
	}

	private static reconstructPath(
		state: BellmanFordState,
		endNode: Node,
		startAmount: bigint,
		graphSnapshot: GraphSnapshot,
	): QuotedPath {
		const edges = this.collectPathEdges(state.predecessors, endNode)
		const quotedSteps = this.calculateQuotedSteps(
			edges,
			startAmount,
			graphSnapshot,
		)

		const endAmount =
			quotedSteps[quotedSteps.length - 1]?.quote.amountOut ?? startAmount

		return {
			quotedStepSequence: quotedSteps,
			startAmount,
			endAmount,
		}
	}

	private static collectCycleEdges(
		predecessors: Map<NodeId, Edge>,
		startNode: Node,
	): Edge[] {
		const edges: Edge[] = []
		let currentNodeId: NodeId = startNode.id

		do {
			const edge = predecessors.get(currentNodeId)

			if (!edge) {
				throw new BellmanFordError('Missing edge in predecessors map')
			}

			edges.push(edge)
			currentNodeId = edge.from.id
		} while (currentNodeId !== startNode.id)

		edges.reverse()
		return edges
	}

	private static collectPathEdges(
		predecessors: Map<NodeId, Edge>,
		endNode: Node,
	): Edge[] {
		const edges: Edge[] = []
		let currentNodeId: NodeId = endNode.id

		while (predecessors.has(currentNodeId)) {
			const edge = predecessors.get(currentNodeId)

			if (!edge) {
				throw new BellmanFordError('Missing edge in predecessors map')
			}

			edges.push(edge)
			currentNodeId = edge.from.id
		}

		edges.reverse()
		return edges
	}

	private static calculateQuotedSteps(
		edges: Edge[],
		startAmount: bigint,
		graphSnapshot: GraphSnapshot,
	): QuotedStep[] {
		const steps: QuotedStep[] = []
		let amount = startAmount

		for (const edge of edges) {
			const quote = graphSnapshot.getQuote(edge.id, amount)
			amount = quote.amountOut
			steps.push({ edge, quote })
		}

		return steps
	}
}
