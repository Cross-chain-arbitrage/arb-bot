import { arbitrum, fuse } from 'viem/chains'
import { NativeCurrency } from '../../src/primitives/tokens/NativeCurrency'
import { Token } from '../../src/primitives/tokens/Token'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { Graph, GraphEdge, GraphError } from '../../src/utils/graphs/Graph'
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
			expect(graph.nodes.has(WBTC_ARB)).toBe(true)
			expect(graph.nodes.has(WETH_FUSE)).toBe(true)
		})

		it('MUST be able to add `NativeCurrency`s as nodes', () => {
			const graph = new Graph()

			const ETH_ARB = TokenUtils.createNative(arbitrum.id)
			const FUSE_FUSE = TokenUtils.createNative(fuse.id)

			graph.addNode(ETH_ARB)
			graph.addNode(FUSE_FUSE)

			expect(graph.nodes.size).toBe(2)
			expect(graph.nodes.has(ETH_ARB)).toBe(true)
			expect(graph.nodes.has(FUSE_FUSE)).toBe(true)
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

			ETH_ARB = TokenUtils.createNative(arbitrum.id)
			FUSE_FUSE = TokenUtils.createNative(fuse.id)

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
				from: WBTC_ARB, // $110k
				to: ETH_ARB, // $2.7k,
				action: {
					type: 'SWAP',
					getRate: (amountIn: bigint) => {
						return Promise.resolve({
							rate: BTC_PRICE / ETH_PRICE,
							amountOut: amountIn,
						})
					},
				},
			}

			const reverseSwapEdge: GraphEdge = {
				from: ETH_ARB,
				to: WBTC_ARB,
				action: {
					type: 'SWAP',
					getRate: (amountIn: bigint) => {
						return Promise.resolve({
							rate: ETH_PRICE / BTC_PRICE,
							amountOut: amountIn,
						})
					},
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
				from: ETH_ARB,
				to: WETH_FUSE,
				action: {
					type: 'STARGATE_BRIDGE',
					getRate: (amountIn: bigint) => {
						return Promise.resolve({
							rate: 1,
							amountOut: amountIn,
						})
					},
				},
			}

			const reverseStargateBridgeEdge: GraphEdge = {
				from: WETH_FUSE,
				to: ETH_ARB,
				action: {
					type: 'STARGATE_BRIDGE',
					getRate: (amountIn: bigint) => {
						return Promise.resolve({
							rate: 1,
							amountOut: amountIn,
						})
					},
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
				from: WBTC_ARB,
				to: WBTC_FUSE,
				action: {
					type: 'FUSE_BRIDGE',
					getRate: (amountIn: bigint) => {
						return Promise.resolve({
							rate: 1,
							amountOut: amountIn,
						})
					},
				},
			}

			const reverseStargateBridgeEdge: GraphEdge = {
				from: WBTC_FUSE,
				to: WBTC_ARB,
				action: {
					type: 'STARGATE_BRIDGE',
					getRate: (amountIn: bigint) => {
						return Promise.resolve({
							rate: 1,
							amountOut: amountIn,
						})
					},
				},
			}

			graph.addEdge(stargateBridgeEdge)
			graph.addEdge(reverseStargateBridgeEdge)

			expect(graph.edges.size).toBe(2)
			expect(graph.edges.has(stargateBridgeEdge)).toBe(true)
			expect(graph.edges.has(reverseStargateBridgeEdge)).toBe(true)
		})
	})

	describe('Errors', () => {
		let WBTC_ARB: Token
		let WETH_FUSE: Token
		let ETH_ARB: NativeCurrency
		let FUSE_FUSE: NativeCurrency
		let WBTC_FUSE: Token

		beforeEach(async () => {
			ETH_ARB = TokenUtils.createNative(arbitrum.id)
			FUSE_FUSE = TokenUtils.createNative(fuse.id)

			WBTC_ARB = await TokenUtils.fromAddress(WBTC_ARB_ADDR, arbitrum.id)
			WETH_FUSE = await TokenUtils.fromAddress(WETH_FUSE_ADDR, fuse.id)
			WBTC_FUSE = await TokenUtils.fromAddress(WBTC_FUSE_ADDR, fuse.id)
		})

		it('MUST throw an error if an edge is added with a node that does not exist', () => {
			const graph = new Graph()
			const edge: GraphEdge = {
				from: WBTC_ARB,
				to: WETH_FUSE,
				action: {
					type: 'SWAP',
					getRate: (amountIn: bigint) => {
						return Promise.resolve({
							rate: 1,
							amountOut: amountIn,
						})
					},
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

			const edge: GraphEdge = {
				from: WBTC_ARB,
				to: WETH_FUSE,
				action: {
					type: 'SWAP',
					getRate: (amountIn: bigint) => {
						return Promise.resolve({
							rate: 1,
							amountOut: amountIn,
						})
					},
				},
			}

			graph.addEdge(edge)
			expect(() => graph.addEdge(edge)).toThrow(GraphError)
		})
	})
})
