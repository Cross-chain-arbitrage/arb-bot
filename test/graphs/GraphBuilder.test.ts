import { arbitrum, fuse, hemi } from 'viem/chains'
import { Pool } from '../../src/dex/base/Pool'
import { PoolType, PoolUtils } from '../../src/dex/PoolUtils'
import { GraphBuilder, GraphBuilderError } from '../../src/graphs/GraphBuilder'
import { ActionType } from '../../src/graphs/primitives/Edge'
import { WrappedNative } from '../../src/primitives/tokens/WrappedNative'
import { makeSuite } from '../testUtils/makeSuite'

const POOLS: {
	address: Address
	chainId: number
	poolType: PoolType
}[] = [
	{
		address: '0x2f5e87C9312fa29aed5c179E456625D79015299c',
		chainId: arbitrum.id,
		poolType: 'UNI_V3',
	},
	{
		address: '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992',
		chainId: fuse.id,
		poolType: 'ALGEBRA_V1_2',
	},
	{
		address: '0xdA44564DF732dECfd93Ba8539803C5a8dF241954',
		chainId: hemi.id,
		poolType: 'UNI_V3',
	},
]

makeSuite('GraphBuilder', () => {
	let pools: Pool[]

	beforeAll(async () => {
		pools = await Promise.all(
			POOLS.map((pool) =>
				PoolUtils.createPool(pool.address, pool.chainId, pool.poolType),
			),
		)
	})

	it('MUST throw on empty pools input', async () => {
		const pools: Pool[] = []

		expect(pools.length).toBe(0)

		await expect(GraphBuilder.build({ pools })).rejects.toThrow(
			new GraphBuilderError('No pools provided'),
		)
	})

	describe('Adding Pools', () => {
		it('MUST add 2 SwapEdges for each Pool', async () => {
			const singlePool = [pools[0]]
			const graph = await GraphBuilder.build({ pools: singlePool })

			const swapEdges = Array.from(graph.edges.values()).filter(
				(edge) => edge.actionType === ActionType.SWAP,
			)

			expect(swapEdges.length).toBe(2)
		})
		it('MUST add Nodes for each Pool', async () => {
			const singlePool = [pools[0]]
			const graph = await GraphBuilder.build({ pools: singlePool })

			const swapEdges = Array.from(graph.edges.values()).filter(
				(edge) => edge.actionType === ActionType.SWAP,
			)

			expect(swapEdges.length).toBe(2)
		})
	})

	describe('Adding Native Currencies', () => {
		it('MUST add Native Currencies for Chain', async () => {
			const arbPool = pools.find((pool) => pool.chainId === arbitrum.id)

			const graph = await GraphBuilder.build({ pools: [arbPool!] })

			const nativeCurrencies = Array.from(graph.nodes.values()).filter(
				(node) => node.isNative(),
			)

			expect(nativeCurrencies.length).toBe(1)
			expect(nativeCurrencies[0].chainId).toBe(arbitrum.id)
		})

		it('MUST add Native Currencies for Multiple Chain', async () => {
			const graph = await GraphBuilder.build({ pools })

			const nativeCurrencies = Array.from(graph.nodes.values()).filter(
				(node) => node.isNative(),
			)

			expect(nativeCurrencies.length).toBe(3)

			const chains = pools.map((pool) => pool.chainId)

			for (const chain of chains) {
				const nativeCurrency = nativeCurrencies.find(
					(node) => node.chainId === chain,
				)

				expect(nativeCurrency).toBeDefined()
			}
		})
	})

	describe('Adding Wrapped Native Currencies', () => {
		it('MUST add Wrapped Native Currencies for Fuse', async () => {
			const fusePool = pools.find((pool) => pool.chainId === fuse.id)

			const graph = await GraphBuilder.build({ pools: [fusePool!] })

			const wrappedNativeCurrencies = Array.from(
				graph.nodes.values(),
			).filter((node) => node instanceof WrappedNative)

			expect(wrappedNativeCurrencies.length).toBe(1)
			expect(wrappedNativeCurrencies[0].chainId).toBe(fuse.id)
		})

		it('MUST add Wrapped Native Currencies for Arbitrum', async () => {
			const arbPool = pools.find((pool) => pool.chainId === arbitrum.id)

			const graph = await GraphBuilder.build({ pools: [arbPool!] })

			const wrappedNativeCurrencies = Array.from(
				graph.nodes.values(),
			).filter((node) => node instanceof WrappedNative)

			expect(wrappedNativeCurrencies.length).toBe(1)
			expect(wrappedNativeCurrencies[0].chainId).toBe(arbitrum.id)
		})

		it('MUST add WRAP/UNWRAP Edges for Arbitrum', async () => {
			const arbPool = pools.find((pool) => pool.chainId === arbitrum.id)

			const graph = await GraphBuilder.build({ pools: [arbPool!] })

			const wrappedNativeCurrencies = Array.from(
				graph.nodes.values(),
			).filter((node) => node instanceof WrappedNative)

			expect(wrappedNativeCurrencies.length).toBe(1)
			expect(wrappedNativeCurrencies[0].chainId).toBe(arbitrum.id)

			const wrapEdges = Array.from(graph.edges.values()).filter(
				(edge) => edge.actionType === ActionType.WRAP,
			)

			const unwrapEdges = Array.from(graph.edges.values()).filter(
				(edge) => edge.actionType === ActionType.UNWRAP,
			)

			expect(wrapEdges.length).toBe(1)
			expect(unwrapEdges.length).toBe(1)

			expect(wrapEdges[0].from.id).toBe(
				wrappedNativeCurrencies[0].native.id,
			)
			expect(wrapEdges[0].to.id).toBe(wrappedNativeCurrencies[0].id)

			expect(unwrapEdges[0].from.id).toBe(wrappedNativeCurrencies[0].id)
			expect(unwrapEdges[0].to.id).toBe(
				wrappedNativeCurrencies[0].native.id,
			)
		})

		it('MUST add Wrapped Native Currencies for Multiple Chain', async () => {
			const graph = await GraphBuilder.build({ pools })

			const wrappedNativeCurrencies = Array.from(
				graph.nodes.values(),
			).filter((node) => node instanceof WrappedNative)

			expect(wrappedNativeCurrencies.length).toBe(3)

			const chains = pools.map((pool) => pool.chainId)

			for (const chain of chains) {
				const wrappedNativeCurrency = wrappedNativeCurrencies.find(
					(node) => node.chainId === chain,
				)

				expect(wrappedNativeCurrency).toBeDefined()
			}
		})
	})

	describe('Adding Stargate Bridges', () => {
		it('MUST add Stargate Bridges for 2 Chains', async () => {
			const arbPool = pools.find((pool) => pool.chainId === arbitrum.id)
			const fusePool = pools.find((pool) => pool.chainId === fuse.id)

			expect(arbPool).toBeDefined()
			expect(fusePool).toBeDefined()

			const graph = await GraphBuilder.build({
				pools: [arbPool!, fusePool!],
			})

			const stargateBridges = Array.from(graph.edges.values()).filter(
				(edge) => edge.actionType === ActionType.STARGATE_BRIDGE,
			)

			expect(stargateBridges.length).toBe(2)

			const bridge = stargateBridges[0]
			const reverseBridge = stargateBridges[1]

			expect(bridge.from).toBe(reverseBridge.to)
			expect(bridge.to).toBe(reverseBridge.from)
		})

		it('MUST add Stargate Bridges for Multiple Chains', async () => {
			const arbUsdcPool = await PoolUtils.createPool(
				'0xC6962004f452bE9203591991D15f6b388e09E8D0',
				arbitrum.id,
				'UNI_V3',
			)

			const graph = await GraphBuilder.build({
				pools: [arbUsdcPool, ...pools],
			})

			const stargateBridges = Array.from(graph.edges.values()).filter(
				(edge) => edge.actionType === ActionType.STARGATE_BRIDGE,
			)

			expect(stargateBridges.length).toBe(8)

			const usdcBridges = stargateBridges.filter((bridge) =>
				graph.getToken(bridge.from.id).symbol.includes('USDC'),
			)

			expect(usdcBridges.length).toBe(2)

			const usdcBridge = usdcBridges[0]
			const reverseUsdcBridge = usdcBridges[1]

			expect(usdcBridge.from).toBe(reverseUsdcBridge.to)
			expect(usdcBridge.to).toBe(reverseUsdcBridge.from)

			const ethBridges = stargateBridges.filter((bridge) =>
				graph.getToken(bridge.from.id).symbol.includes('ETH'),
			)

			expect(ethBridges.length).toBe(6)

			for (const bridge of ethBridges) {
				const from = graph.getToken(bridge.from.id)
				const to = graph.getToken(bridge.to.id)

				expect(from.symbol.includes('ETH')).toBe(true)
				expect(to.symbol.includes('ETH')).toBe(true)
			}
		})

		describe('Stargate Config', () => {
			it('MUST NOT connect Hydra Chains if connectHydraChains is false', async () => {
				const graph = await GraphBuilder.build({
					pools,
					stargateConfig: {
						connectSecondaryChains: false,
						baseChainId: arbitrum.id,
					},
				})

				const stargateBridges = Array.from(graph.edges.values()).filter(
					(edge) => edge.actionType === ActionType.STARGATE_BRIDGE,
				)

				expect(stargateBridges.length).toBe(4)

				for (const bridge of stargateBridges) {
					const from = graph.getToken(bridge.from.id)
					const to = graph.getToken(bridge.to.id)

					expect(
						[from.chainId, to.chainId].includes(arbitrum.id),
					).toBe(true)
				}
			})

			it('All bridging edges MUST include base chain, if connectSecondaryChains is false', async () => {
				const graph = await GraphBuilder.build({
					pools,
					stargateConfig: {
						connectSecondaryChains: false,
						baseChainId: fuse.id,
					},
				})

				const stargateBridges = Array.from(graph.edges.values()).filter(
					(edge) => edge.actionType === ActionType.STARGATE_BRIDGE,
				)

				expect(stargateBridges.length).toBe(4)

				for (const bridge of stargateBridges) {
					const from = graph.getToken(bridge.from.id)
					const to = graph.getToken(bridge.to.id)

					// All pairs must include base chain
					expect([from.chainId, to.chainId].includes(fuse.id)).toBe(
						true,
					)
				}
			})
		})
	})

	describe('Adding Fuse Bridges', () => {
		it('MUST add 2 Fuse Bridges for Fuse Chain', async () => {
			const graph = await GraphBuilder.build({ pools })
			const fuseBridges = Array.from(graph.edges.values()).filter(
				(edge) => edge.actionType === ActionType.FUSE_BRIDGE,
			)

			expect(fuseBridges.length).toBe(2)

			const bridge = fuseBridges[0]
			const reverseBridge = fuseBridges[1]

			// Check that the bridges are reversible

			const from = graph.getToken(bridge.from.id)
			const to = graph.getToken(bridge.to.id)

			const reverseFrom = graph.getToken(reverseBridge.from.id)
			const reverseTo = graph.getToken(reverseBridge.to.id)

			expect(from.symbol.includes('WBTC')).toBe(true)
			expect(to.symbol.includes('WBTC')).toBe(true)
			expect(reverseFrom.symbol.includes('WBTC')).toBe(true)
			expect(reverseTo.symbol.includes('WBTC')).toBe(true)

			expect(bridge.from).toBe(reverseBridge.to)
			expect(bridge.to).toBe(reverseBridge.from)
		})
	})
})
