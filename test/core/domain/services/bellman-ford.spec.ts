import { Edge } from '../../../../src/core/domain/entities/edge'
import { Graph } from '../../../../src/core/domain/entities/graph'
import { Node } from '../../../../src/core/domain/entities/node'
import { BellmanFord } from '../../../../src/core/domain/services/bellman-ford'
import { EdgeId } from '../../../../src/core/domain/value-objects/edge-id'
import { Quote } from '../../../../src/core/domain/value-objects/quote'
import { GraphSnapshot } from '../../../../src/core/domain/value-objects/weighted-graph-snapshot'

describe('BellmanFord', () => {
	describe('findNegativeSumCycle', () => {
		it('should find a profitable arbitrage cycle', () => {
			const { graphSnapshot, nodeA } = createSimpleArbitrageCycle()

			const startAmount = 1000n
			const result = BellmanFord.findNegativeSumCycle(
				nodeA,
				startAmount,
				graphSnapshot,
			)

			expect(result).not.toBeNull()
			expect(result!.startAmount).toBe(startAmount)
			expect(result!.endAmount).toBeGreaterThan(startAmount)
			expect(result!.quotedStepSequence).toHaveLength(3)
		})

		it('should return null when no negative cycle exists', () => {
			const { graphSnapshot, nodeA } = createGraphWithoutArbitrage()

			const startAmount = 1000n
			const result = BellmanFord.findNegativeSumCycle(
				nodeA,
				startAmount,
				graphSnapshot,
			)

			expect(result).toBeNull()
		})

		it('should return null when cycle exists but is not profitable', () => {
			const { graphSnapshot, nodeA } = createUnprofitableCycle()

			const startAmount = 1000n
			const result = BellmanFord.findNegativeSumCycle(
				nodeA,
				startAmount,
				graphSnapshot,
			)

			expect(result).toBeNull()
		})

		it('should handle complex graph with multiple cycles', () => {
			const { graphSnapshot, nodeA } = createComplexGraphWithArbitrage()

			const startAmount = 1000n
			const result = BellmanFord.findNegativeSumCycle(
				nodeA,
				startAmount,
				graphSnapshot,
			)

			expect(result).not.toBeNull()
			expect(result!.endAmount).toBeGreaterThan(startAmount)
		})

		it('should calculate correct amounts through the cycle', () => {
			const { graphSnapshot, nodeA } = createSimpleArbitrageCycle()

			const startAmount = 1000n
			const result = BellmanFord.findNegativeSumCycle(
				nodeA,
				startAmount,
				graphSnapshot,
			)

			expect(result).not.toBeNull()

			let currentAmount = startAmount
			for (const step of result!.quotedStepSequence) {
				expect(step.quote.amountOut).toBeGreaterThan(0n)
				currentAmount = step.quote.amountOut
			}

			expect(currentAmount).toBe(result!.endAmount)
		})
	})

	describe('findPath', () => {
		it('should find shortest path between two nodes', () => {
			const { graphSnapshot, nodeA, nodeC } = createLinearGraph()

			const startAmount = 1000n
			const result = BellmanFord.findPath(
				nodeA,
				nodeC,
				startAmount,
				graphSnapshot,
			)

			expect(result).not.toBeNull()
			expect(result!.startAmount).toBe(startAmount)
			expect(result!.quotedStepSequence.length).toBeGreaterThan(0)
			expect(result!.quotedStepSequence[0].edge.from.id).toBe(nodeA.id)
			expect(
				result!.quotedStepSequence[
					result!.quotedStepSequence.length - 1
				].edge.to.id,
			).toBe(nodeC.id)
		})

		it('should return path with empty steps when start equals end', () => {
			const { graphSnapshot, nodeA } = createLinearGraph()

			const startAmount = 1000n
			const result = BellmanFord.findPath(
				nodeA,
				nodeA,
				startAmount,
				graphSnapshot,
			)

			expect(result).not.toBeNull()
			expect(result!.quotedStepSequence).toHaveLength(0)
			expect(result!.startAmount).toBe(startAmount)
			expect(result!.endAmount).toBe(startAmount)
		})

		it('should return null when no path exists', () => {
			const { graphSnapshot, nodeA, nodeD } = createDisconnectedGraph()

			const startAmount = 1000n
			const result = BellmanFord.findPath(
				nodeA,
				nodeD,
				startAmount,
				graphSnapshot,
			)

			expect(result).toBeNull()
		})

		it('should find optimal path when multiple paths exist', () => {
			const { graphSnapshot, nodeA, nodeD } =
				createGraphWithMultiplePaths()

			const startAmount = 1000n
			const result = BellmanFord.findPath(
				nodeA,
				nodeD,
				startAmount,
				graphSnapshot,
			)

			expect(result).not.toBeNull()
			expect(result!.endAmount).toBeGreaterThan(0n)
		})

		it('should calculate correct amounts through the path', () => {
			const { graphSnapshot, nodeA, nodeC } = createLinearGraph()

			const startAmount = 1000n
			const result = BellmanFord.findPath(
				nodeA,
				nodeC,
				startAmount,
				graphSnapshot,
			)

			expect(result).not.toBeNull()

			let currentAmount = startAmount
			for (const step of result!.quotedStepSequence) {
				expect(step.quote.amountOut).toBeGreaterThan(0n)
				currentAmount = step.quote.amountOut
			}

			expect(currentAmount).toBe(result!.endAmount)
		})

		it('should handle long paths correctly', () => {
			const { graphSnapshot, nodeA, nodeE } = createLongLinearGraph()

			const startAmount = 1000n
			const result = BellmanFord.findPath(
				nodeA,
				nodeE,
				startAmount,
				graphSnapshot,
			)

			expect(result).not.toBeNull()
			expect(result!.quotedStepSequence).toHaveLength(4)
			expect(result!.endAmount).toBeGreaterThan(0n)
		})
	})
})

function createSimpleArbitrageCycle() {
	const graph = new Graph()

	const nodeA: Node = { id: 'A' }
	const nodeB: Node = { id: 'B' }
	const nodeC: Node = { id: 'C' }

	graph.addNode(nodeA)
	graph.addNode(nodeB)
	graph.addNode(nodeC)

	const edgeAB: Edge = {
		id: 'channel1::A::B' as EdgeId,
		from: nodeA,
		to: nodeB,
	}
	const edgeBC: Edge = {
		id: 'channel2::B::C' as EdgeId,
		from: nodeB,
		to: nodeC,
	}
	const edgeCA: Edge = {
		id: 'channel3::C::A' as EdgeId,
		from: nodeC,
		to: nodeA,
	}

	graph.addEdge(edgeAB)
	graph.addEdge(edgeBC)
	graph.addEdge(edgeCA)

	const graphSnapshot: GraphSnapshot = {
		graph,
		getQuote: (edgeId: EdgeId, amountIn: bigint): Quote => {
			const rate = 1.02
			const amountOut = BigInt(Math.floor(Number(amountIn) * rate))

			return {
				negativeLogRate: -Math.log(rate),
				amountOut,
				expectedCostInUsd: 0.1,
			}
		},
	}

	return { graph, graphSnapshot, nodeA, nodeB, nodeC }
}

function createGraphWithoutArbitrage() {
	const graph = new Graph()

	const nodeA: Node = { id: 'A' }
	const nodeB: Node = { id: 'B' }
	const nodeC: Node = { id: 'C' }

	graph.addNode(nodeA)
	graph.addNode(nodeB)
	graph.addNode(nodeC)

	const edgeAB: Edge = {
		id: 'channel1::A::B' as EdgeId,
		from: nodeA,
		to: nodeB,
	}
	const edgeBC: Edge = {
		id: 'channel2::B::C' as EdgeId,
		from: nodeB,
		to: nodeC,
	}

	graph.addEdge(edgeAB)
	graph.addEdge(edgeBC)

	const graphSnapshot: GraphSnapshot = {
		graph,
		getQuote: (edgeId: EdgeId, amountIn: bigint): Quote => {
			const rate = 0.99
			const amountOut = BigInt(Math.floor(Number(amountIn) * rate))

			return {
				negativeLogRate: -Math.log(rate),
				amountOut,
				expectedCostInUsd: 0.1,
			}
		},
	}

	return { graph, graphSnapshot, nodeA, nodeB, nodeC }
}

function createUnprofitableCycle() {
	const graph = new Graph()

	const nodeA: Node = { id: 'A' }
	const nodeB: Node = { id: 'B' }
	const nodeC: Node = { id: 'C' }

	graph.addNode(nodeA)
	graph.addNode(nodeB)
	graph.addNode(nodeC)

	const edgeAB: Edge = {
		id: 'channel1::A::B' as EdgeId,
		from: nodeA,
		to: nodeB,
	}
	const edgeBC: Edge = {
		id: 'channel2::B::C' as EdgeId,
		from: nodeB,
		to: nodeC,
	}
	const edgeCA: Edge = {
		id: 'channel3::C::A' as EdgeId,
		from: nodeC,
		to: nodeA,
	}

	graph.addEdge(edgeAB)
	graph.addEdge(edgeBC)
	graph.addEdge(edgeCA)

	const graphSnapshot: GraphSnapshot = {
		graph,
		getQuote: (edgeId: EdgeId, amountIn: bigint): Quote => {
			const rate = 0.95
			const amountOut = BigInt(Math.floor(Number(amountIn) * rate))

			return {
				negativeLogRate: -Math.log(rate),
				amountOut,
				expectedCostInUsd: 0.1,
			}
		},
	}

	return { graph, graphSnapshot, nodeA, nodeB, nodeC }
}

function createComplexGraphWithArbitrage() {
	const graph = new Graph()

	const nodeA: Node = { id: 'A' }
	const nodeB: Node = { id: 'B' }
	const nodeC: Node = { id: 'C' }
	const nodeD: Node = { id: 'D' }

	graph.addNode(nodeA)
	graph.addNode(nodeB)
	graph.addNode(nodeC)
	graph.addNode(nodeD)

	const edgeAB: Edge = {
		id: 'channel1::A::B' as EdgeId,
		from: nodeA,
		to: nodeB,
	}
	const edgeBC: Edge = {
		id: 'channel2::B::C' as EdgeId,
		from: nodeB,
		to: nodeC,
	}
	const edgeCA: Edge = {
		id: 'channel3::C::A' as EdgeId,
		from: nodeC,
		to: nodeA,
	}
	const edgeBD: Edge = {
		id: 'channel4::B::D' as EdgeId,
		from: nodeB,
		to: nodeD,
	}
	const edgeDA: Edge = {
		id: 'channel5::D::A' as EdgeId,
		from: nodeD,
		to: nodeA,
	}

	graph.addEdge(edgeAB)
	graph.addEdge(edgeBC)
	graph.addEdge(edgeCA)
	graph.addEdge(edgeBD)
	graph.addEdge(edgeDA)

	const graphSnapshot: GraphSnapshot = {
		graph,
		getQuote: (edgeId: EdgeId, amountIn: bigint): Quote => {
			const rate = 1.015
			const amountOut = BigInt(Math.floor(Number(amountIn) * rate))

			return {
				negativeLogRate: -Math.log(rate),
				amountOut,
				expectedCostInUsd: 0.1,
			}
		},
	}

	return { graph, graphSnapshot, nodeA, nodeB, nodeC, nodeD }
}

function createLinearGraph() {
	const graph = new Graph()

	const nodeA: Node = { id: 'A' }
	const nodeB: Node = { id: 'B' }
	const nodeC: Node = { id: 'C' }

	graph.addNode(nodeA)
	graph.addNode(nodeB)
	graph.addNode(nodeC)

	const edgeAB: Edge = {
		id: 'channel1::A::B' as EdgeId,
		from: nodeA,
		to: nodeB,
	}
	const edgeBC: Edge = {
		id: 'channel2::B::C' as EdgeId,
		from: nodeB,
		to: nodeC,
	}

	graph.addEdge(edgeAB)
	graph.addEdge(edgeBC)

	const graphSnapshot: GraphSnapshot = {
		graph,
		getQuote: (edgeId: EdgeId, amountIn: bigint): Quote => {
			const rate = 0.98
			const amountOut = BigInt(Math.floor(Number(amountIn) * rate))

			return {
				negativeLogRate: -Math.log(rate),
				amountOut,
				expectedCostInUsd: 0.1,
			}
		},
	}

	return { graph, graphSnapshot, nodeA, nodeB, nodeC }
}

function createDisconnectedGraph() {
	const graph = new Graph()

	const nodeA: Node = { id: 'A' }
	const nodeB: Node = { id: 'B' }
	const nodeC: Node = { id: 'C' }
	const nodeD: Node = { id: 'D' }

	graph.addNode(nodeA)
	graph.addNode(nodeB)
	graph.addNode(nodeC)
	graph.addNode(nodeD)

	const edgeAB: Edge = {
		id: 'channel1::A::B' as EdgeId,
		from: nodeA,
		to: nodeB,
	}
	const edgeBC: Edge = {
		id: 'channel2::B::C' as EdgeId,
		from: nodeB,
		to: nodeC,
	}

	graph.addEdge(edgeAB)
	graph.addEdge(edgeBC)

	const graphSnapshot: GraphSnapshot = {
		graph,
		getQuote: (edgeId: EdgeId, amountIn: bigint): Quote => {
			const rate = 0.98
			const amountOut = BigInt(Math.floor(Number(amountIn) * rate))

			return {
				negativeLogRate: -Math.log(rate),
				amountOut,
				expectedCostInUsd: 0.1,
			}
		},
	}

	return { graph, graphSnapshot, nodeA, nodeB, nodeC, nodeD }
}

function createGraphWithMultiplePaths() {
	const graph = new Graph()

	const nodeA: Node = { id: 'A' }
	const nodeB: Node = { id: 'B' }
	const nodeC: Node = { id: 'C' }
	const nodeD: Node = { id: 'D' }

	graph.addNode(nodeA)
	graph.addNode(nodeB)
	graph.addNode(nodeC)
	graph.addNode(nodeD)

	const edgeAB: Edge = {
		id: 'channel1::A::B' as EdgeId,
		from: nodeA,
		to: nodeB,
	}
	const edgeAC: Edge = {
		id: 'channel2::A::C' as EdgeId,
		from: nodeA,
		to: nodeC,
	}
	const edgeBD: Edge = {
		id: 'channel3::B::D' as EdgeId,
		from: nodeB,
		to: nodeD,
	}
	const edgeCD: Edge = {
		id: 'channel4::C::D' as EdgeId,
		from: nodeC,
		to: nodeD,
	}

	graph.addEdge(edgeAB)
	graph.addEdge(edgeAC)
	graph.addEdge(edgeBD)
	graph.addEdge(edgeCD)

	const graphSnapshot: GraphSnapshot = {
		graph,
		getQuote: (edgeId: EdgeId, amountIn: bigint): Quote => {
			const rates: Record<string, number> = {
				'channel1::A::B': 0.99,
				'channel2::A::C': 0.98,
				'channel3::B::D': 0.99,
				'channel4::C::D': 0.99,
			}

			const rate = rates[edgeId] || 0.98
			const amountOut = BigInt(Math.floor(Number(amountIn) * rate))

			return {
				negativeLogRate: -Math.log(rate),
				amountOut,
				expectedCostInUsd: 0.1,
			}
		},
	}

	return { graph, graphSnapshot, nodeA, nodeB, nodeC, nodeD }
}

function createLongLinearGraph() {
	const graph = new Graph()

	const nodeA: Node = { id: 'A' }
	const nodeB: Node = { id: 'B' }
	const nodeC: Node = { id: 'C' }
	const nodeD: Node = { id: 'D' }
	const nodeE: Node = { id: 'E' }

	graph.addNode(nodeA)
	graph.addNode(nodeB)
	graph.addNode(nodeC)
	graph.addNode(nodeD)
	graph.addNode(nodeE)

	const edgeAB: Edge = {
		id: 'channel1::A::B' as EdgeId,
		from: nodeA,
		to: nodeB,
	}
	const edgeBC: Edge = {
		id: 'channel2::B::C' as EdgeId,
		from: nodeB,
		to: nodeC,
	}
	const edgeCD: Edge = {
		id: 'channel3::C::D' as EdgeId,
		from: nodeC,
		to: nodeD,
	}
	const edgeDE: Edge = {
		id: 'channel4::D::E' as EdgeId,
		from: nodeD,
		to: nodeE,
	}

	graph.addEdge(edgeAB)
	graph.addEdge(edgeBC)
	graph.addEdge(edgeCD)
	graph.addEdge(edgeDE)

	const graphSnapshot: GraphSnapshot = {
		graph,
		getQuote: (edgeId: EdgeId, amountIn: bigint): Quote => {
			const rate = 0.98
			const amountOut = BigInt(Math.floor(Number(amountIn) * rate))

			return {
				negativeLogRate: -Math.log(rate),
				amountOut,
				expectedCostInUsd: 0.1,
			}
		},
	}

	return { graph, graphSnapshot, nodeA, nodeB, nodeC, nodeD, nodeE }
}
