import { arbitrum, fuse } from 'viem/chains'
import { Pool } from '../../src/dex/Pool'
import { UniV3Pool } from '../../src/dex/uniswapV3/Pool'
import {
	ActionType,
	Graph,
	GraphEdge,
	GraphError,
} from '../../src/graphs/Graph'
import { NativeCurrency } from '../../src/primitives/tokens/NativeCurrency'
import { Token } from '../../src/primitives/tokens/Token'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { makeSuite } from '../utils/makeSuite'

makeSuite('Graph', () => {
	const WBTC_ARB_ADDR = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
	const WETH_FUSE_ADDR = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
	const WBTC_FUSE_ADDR = '0x33284f95ccb7B948d9D352e1439561CF83d8d00d'

	it('MUST be creatable', () => {
		const graph = new Graph()
		expect(graph).toBeDefined()
	})

	describe('MUST be able to add nodes', () => {
		it('MUST be able to add `Token`s as nodes', async () => {
			const graph = new Graph()

			const WBTC_ARB = await TokenUtils.fromAddress(
				WBTC_ARB_ADDR,
				arbitrum.id,
			)
			const WETH_FUSE = await TokenUtils.fromAddress(
				WETH_FUSE_ADDR,
				fuse.id,
			)

			graph.addNode(WBTC_ARB)
			graph.addNode(WETH_FUSE)

			expect(graph.nodes.size).toBe(2)
			expect(graph.nodes.has(WBTC_ARB.id)).toBe(true)
			expect(graph.nodes.has(WETH_FUSE.id)).toBe(true)
		})

		it('MUST be able to add `NativeCurrency`s as nodes', () => {
			const graph = new Graph()

			const ETH_ARB = TokenUtils.getNative(arbitrum.id)
			const FUSE_FUSE = TokenUtils.getNative(fuse.id)

			graph.addNode(ETH_ARB)
			graph.addNode(FUSE_FUSE)

			expect(graph.nodes.size).toBe(2)
			expect(graph.nodes.has(ETH_ARB.id)).toBe(true)
			expect(graph.nodes.has(FUSE_FUSE.id)).toBe(true)
		})
	})

	describe('MUST be able to add edges', () => {
		let graph: Graph
		let WBTC_ARB: Token
		let WETH_FUSE: Token
		let ETH_ARB: NativeCurrency
		let FUSE_FUSE: NativeCurrency
		let WBTC_FUSE: Token

		beforeEach(async () => {
			graph = new Graph()

			ETH_ARB = TokenUtils.getNative(arbitrum.id)
			FUSE_FUSE = TokenUtils.getNative(fuse.id)

			WBTC_ARB = await TokenUtils.fromAddress(WBTC_ARB_ADDR, arbitrum.id)
			WETH_FUSE = await TokenUtils.fromAddress(WETH_FUSE_ADDR, fuse.id)
			WBTC_FUSE = await TokenUtils.fromAddress(WBTC_FUSE_ADDR, fuse.id)

			graph.addNode(ETH_ARB)
			graph.addNode(FUSE_FUSE)

			graph.addNode(WBTC_ARB)
			graph.addNode(WETH_FUSE)
			graph.addNode(WBTC_FUSE)
		})

		it('MUST be able to add `Swap`s as edges', () => {
			const BTC_PRICE = 110_000
			const ETH_PRICE = 2_700

			const swapEdge: GraphEdge = {
				from: WBTC_ARB.id, // $110k
				to: ETH_ARB.id, // $2.7k,
				type: ActionType.SWAP,
				pool: {} as Pool,
				getRate: (amountIn: bigint) => {
					return Promise.resolve({
						rate: BTC_PRICE / ETH_PRICE,
						amountOut: amountIn,
					})
				},
			}

			const reverseSwapEdge: GraphEdge = {
				from: ETH_ARB.id,
				to: WBTC_ARB.id,
				type: ActionType.SWAP,
				pool: {} as Pool,
				getRate: (amountIn: bigint) => {
					return Promise.resolve({
						rate: ETH_PRICE / BTC_PRICE,
						amountOut: amountIn,
					})
				},
			}
			graph.addEdge(swapEdge)
			graph.addEdge(reverseSwapEdge)

			expect(graph.edges.size).toBe(2)
			expect(graph.edges.has(swapEdge)).toBe(true)
			expect(graph.edges.has(reverseSwapEdge)).toBe(true)
		})

		it('MUST be able to add `Stargate Bridge`s as edges', () => {
			const stargateBridgeEdge: GraphEdge = {
				from: ETH_ARB.id,
				to: WETH_FUSE.id,
				type: ActionType.STARGATE_BRIDGE,
				getRate: (amountIn: bigint) => {
					return Promise.resolve({
						rate: 1,
						amountOut: amountIn,
					})
				},
			}

			const reverseStargateBridgeEdge: GraphEdge = {
				from: WETH_FUSE.id,
				to: ETH_ARB.id,
				type: ActionType.STARGATE_BRIDGE,
				getRate: (amountIn: bigint) => {
					return Promise.resolve({
						rate: 1,
						amountOut: amountIn,
					})
				},
			}

			graph.addEdge(stargateBridgeEdge)
			graph.addEdge(reverseStargateBridgeEdge)

			expect(graph.edges.size).toBe(2)
			expect(graph.edges.has(stargateBridgeEdge)).toBe(true)
			expect(graph.edges.has(reverseStargateBridgeEdge)).toBe(true)
		})

		it('MUST be able to add `Fuse Bridge`s as edges', () => {
			const stargateBridgeEdge: GraphEdge = {
				from: WBTC_ARB.id,
				to: WBTC_FUSE.id,
				type: ActionType.FUSE_BRIDGE,
				getRate: (amountIn: bigint) => {
					return Promise.resolve({
						rate: 1,
						amountOut: amountIn,
					})
				},
			}

			const reverseStargateBridgeEdge: GraphEdge = {
				from: WBTC_FUSE.id,
				to: WBTC_ARB.id,
				type: ActionType.FUSE_BRIDGE,
				getRate: (amountIn: bigint) => {
					return Promise.resolve({
						rate: 1,
						amountOut: amountIn,
					})
				},
			}

			graph.addEdge(stargateBridgeEdge)
			graph.addEdge(reverseStargateBridgeEdge)

			expect(graph.edges.size).toBe(2)
			expect(graph.edges.has(stargateBridgeEdge)).toBe(true)
			expect(graph.edges.has(reverseStargateBridgeEdge)).toBe(true)
		})
	})

	describe.only('MUST be able to add `DexPool`s as an edge', () => {
		let graph: Graph

		beforeEach(() => {
			graph = new Graph()
		})

		it('MUST be able to add `DexPool`s as an edge', async () => {
			const pool = await UniV3Pool.create(
				'0x2f5e87C9312fa29aed5c179E456625D79015299c',
				arbitrum.id,
			)

			graph.addDexPool(pool, 50)

			// Check adding nodes
			expect(graph.nodes.size).toBe(2)
			expect(graph.nodes.has(pool.token0.id)).toBe(true)
			expect(graph.nodes.has(pool.token1.id)).toBe(true)

			// Check adding edges
			expect(graph.edges.size).toBe(2)

			const edges = Array.from(graph.edges)
			const edge = edges[0]
			const reverseEdge = edges[1]

			// Check that edges are reversed
			expect(edge.from).toBe(reverseEdge.to)
			expect(edge.to).toBe(reverseEdge.from)

			// Check that edges are of type `SWAP`
			expect(edge.type).toBe(ActionType.SWAP)
			expect(reverseEdge.type).toBe(ActionType.SWAP)

			// Check that getRate is working and different directions return different rates
			const getRate = await edge.getRate(pool.token0.parseUnits('0.001'))
			expect(getRate.rate).not.toEqual(0)
			expect(getRate.amountOut).toBeGreaterThan(0n)

			const getReverseRate = await reverseEdge.getRate(
				pool.token1.parseUnits('0.001'),
			)
			expect(getReverseRate.rate).not.toEqual(0)
			expect(getReverseRate.amountOut).toBeGreaterThan(0n)

			expect(getRate.rate).not.toEqual(getReverseRate.rate)
		})
	})

	describe('Errors', () => {
		let WBTC_ARB: Token
		let WETH_FUSE: Token
		let ETH_ARB: NativeCurrency

		beforeEach(async () => {
			ETH_ARB = TokenUtils.getNative(arbitrum.id)

			WBTC_ARB = await TokenUtils.fromAddress(WBTC_ARB_ADDR, arbitrum.id)
			WETH_FUSE = await TokenUtils.fromAddress(WETH_FUSE_ADDR, fuse.id)
		})

		it('MUST throw an error if an edge is added with a node that does not exist', () => {
			const graph = new Graph()
			const edge: GraphEdge = {
				from: WBTC_ARB.id,
				to: WETH_FUSE.id,
				type: ActionType.SWAP,
				pool: {} as Pool,
				getRate: (amountIn: bigint) => {
					return Promise.resolve({
						rate: 1,
						amountOut: amountIn,
					})
				},
			}

			expect(() => graph.addEdge(edge)).toThrow(GraphError)
		})

		it('MUST throw an error if node is added twice', () => {
			const graph = new Graph()

			graph.addNode(ETH_ARB)

			expect(() => graph.addNode(ETH_ARB)).toThrow(GraphError)
		})

		it('MUST throw an error if edge is added twice', () => {
			const graph = new Graph()

			graph.addNode(WBTC_ARB)
			graph.addNode(WETH_FUSE)

			const edge: GraphEdge = {
				from: WBTC_ARB.id,
				to: WETH_FUSE.id,
				type: ActionType.SWAP,
				pool: {} as Pool,
				getRate: (amountIn: bigint) => {
					return Promise.resolve({
						rate: 1,
						amountOut: amountIn,
					})
				},
			}

			graph.addEdge(edge)
			expect(() => graph.addEdge(edge)).toThrow(GraphError)
		})
	})
})
