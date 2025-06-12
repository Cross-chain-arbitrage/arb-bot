import { arbitrum } from 'viem/chains'
import { Graph } from '../../src/graphs/Graph'
import { findArbitragePath } from '../../src/graphs/path'
import { makeSuite } from '../utils/makeSuite'
import { getWethWbtcFuseGraph } from './examples/BtcWethGraph'
import { getWethWbtcFuseGraphWithDeadEnd } from './examples/BtcWethGraphWithDeadEnd'

makeSuite('Path optimization in Graph', () => {
	let graph: Graph | undefined

	beforeEach(() => {
		graph = undefined
	})

	describe('findArbitragePath', () => {
		it('MUST be able to find the optimal path', async () => {
			const spread = 0.05
			graph = await getWethWbtcFuseGraph(1 + spread)

			const nodes = Array.from(graph.nodes.values())
			const startToken = nodes.find(
				(node) => node.isNative() && node.chainId === arbitrum.id,
			)!

			expect(startToken).toBeDefined()

			const startAmount = startToken.parseUnits('0.001')

			const path = (await findArbitragePath(
				startToken,
				startAmount,
				graph,
				4,
			))!

			expect(path).not.toBeNull()

			await graph.printTable(startAmount)

			expect(path.edges.length).toBe(4)

			expect(path.endAmount).toBeGreaterThan(startAmount)
			expect(path.startAmount).toBe(startAmount)

			const endAmountNumber = Number(
				startToken.formatUnits(path.endAmount),
			)
			const startAmountNumber = Number(
				startToken.formatUnits(path.startAmount),
			)
			expect(endAmountNumber).toBeCloseTo(
				startAmountNumber * (1 + spread),
				2,
			)

			expect(path.profitPercentage).toBeCloseTo(spread * 100, 1)
			expect(path.profitAmount).toBeGreaterThan(0)
		})

		it('MUST be able to find the  reversed optimal path in mirrored situation', async () => {
			const spread = 0.05
			graph = await getWethWbtcFuseGraph(1 - spread)

			const nodes = Array.from(graph.nodes.values())
			const startToken = nodes.find(
				(node) => node.isNative() && node.chainId === arbitrum.id,
			)!

			expect(startToken).toBeDefined()

			const startAmount = startToken.parseUnits('0.001')

			const path = (await findArbitragePath(
				startToken,
				startAmount,
				graph,
				4,
			))!

			expect(path).not.toBeNull()

			console.log('path', path.edges)

			expect(path.edges.length).toBe(4)

			expect(path.endAmount).toBeGreaterThan(startAmount)
			expect(path.startAmount).toBe(startAmount)

			const endAmountNumber = Number(
				startToken.formatUnits(path.endAmount),
			)
			const startAmountNumber = Number(
				startToken.formatUnits(path.startAmount),
			)
			expect(endAmountNumber).toBeCloseTo(
				startAmountNumber * (1 + spread),
				2,
			)

			expect(path.profitAmount).toBeGreaterThan(0)
			expect(path.profitPercentage).toBeCloseTo(spread * 100, 0)
		})

		it('MUST NOT fall into dead ends', async () => {
			const spread = 0.05
			graph = await getWethWbtcFuseGraphWithDeadEnd(1 + spread)

			const nodes = Array.from(graph.nodes.values())
			const startToken = nodes.find(
				(node) => node.isNative() && node.chainId === arbitrum.id,
			)!

			expect(startToken).toBeDefined()

			const startAmount = startToken.parseUnits('0.001')

			const path = (await findArbitragePath(
				startToken,
				startAmount,
				graph,
				4,
			))!

			expect(path).not.toBeNull()

			console.log('path', path.edges)

			expect(path.edges.length).toBe(4)

			expect(path.endAmount).toBeGreaterThan(startAmount)
			expect(path.startAmount).toBe(startAmount)

			const endAmountNumber = Number(
				startToken.formatUnits(path.endAmount),
			)
			const startAmountNumber = Number(
				startToken.formatUnits(path.startAmount),
			)
			expect(endAmountNumber).toBeCloseTo(
				startAmountNumber * (1 + spread),
				2,
			)

			expect(path.profitAmount).toBeGreaterThan(0)
			expect(path.profitPercentage).toBeCloseTo(spread * 100, 0)
		})
	})
})
