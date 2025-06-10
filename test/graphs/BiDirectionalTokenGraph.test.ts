import {
	BiDirectionalTokenGraph,
	BiDirectionalTokenGraphError,
} from '../../src/utils/graphs/BiDirectionalGraph'
import { makeSuite } from '../utils/makeSuite'
import { Token } from '../../src/primitives/tokens/Token'

makeSuite('BiDirectionalTokenGraph', () => {
	let graph: BiDirectionalTokenGraph
	let token1: Token
	let token2: Token
	let token3: Token

	beforeAll(() => {
		const randomTokenAddress = '0x0000000000000000000000000000000000000123'
		token1 = new Token(randomTokenAddress, 1, 'TKN', 18, 'TKN')
		token2 = new Token(randomTokenAddress, 42161, 'TKN', 18, 'TKN')
		token3 = new Token(randomTokenAddress, 56, 'TKN', 18, 'TKN')

		graph = new BiDirectionalTokenGraph()
	})

	describe('Node Management', () => {
		it('test_AddNode_Success', () => {
			graph.addNode(token1)
			expect(graph.adjacencyMatrix.has(token1)).toBe(true)
		})

		it('test_AddNode_RevertIf_NodeExists', () => {
			expect(() => graph.addNode(token1)).toThrow(
				BiDirectionalTokenGraphError,
			)
		})
	})

	describe('Edge Management', () => {
		beforeEach(() => {
			graph = new BiDirectionalTokenGraph()
			graph.addNode(token1)
			graph.addNode(token2)
		})

		it('test_AddEdge_Success', () => {
			graph.addEdge(token1, token2)
			expect(graph.adjacencyMatrix.get(token1)?.get(token2)).toBe(true)
			expect(graph.adjacencyMatrix.get(token2)?.get(token1)).toBe(true)
		})

		it('test_AddEdge_RevertIf_NodeDoesNotExist', () => {
			expect(() => graph.addEdge(token1, token3)).toThrow(
				BiDirectionalTokenGraphError,
			)
		})

		it('test_AddEdge_RevertIf_EdgeExists', () => {
			graph.addEdge(token1, token2)
			expect(() => graph.addEdge(token1, token2)).toThrow(
				BiDirectionalTokenGraphError,
			)
		})
	})

	describe('Graph Properties', () => {
		it('test_IsCircular_ReturnsFalse', () => {
			expect(graph.isCircular()).toBe(false)
		})
	})
})
