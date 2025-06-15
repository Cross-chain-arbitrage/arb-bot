import { arbitrum, fuse, hemi } from 'viem/chains'
import { Pool } from '../../src/dex/Pool'
import { PoolType, PoolUtils } from '../../src/dex/PoolUtils'
import { ActionType } from '../../src/graphs/Graph'
import { GraphBuilder, GraphBuilderError } from '../../src/graphs/GraphBuilder'
import { WrappedNative } from '../../src/primitives/tokens/WrappedNative'
import { makeSuite } from '../utils/makeSuite'

const POOLS: {
	address: Address
	chainId: number
	poolType: PoolType
}[] = [
	{
		address: '0x2f5e87C9312fa29aed5c179E456625D79015299c',
		chainId: arbitrum.id,
		poolType: PoolType.UNIV3,
	},
	{
		address: '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992',
		chainId: fuse.id,
		poolType: PoolType.ALGEBRA,
	},
	{
		address: '0xdA44564DF732dECfd93Ba8539803C5a8dF241954',
		chainId: hemi.id,
		poolType: PoolType.UNIV3,
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

		await expect(GraphBuilder.buildFromPools(pools)).rejects.toThrow(
			new GraphBuilderError('No pools provided'),
		)
	})

	describe('Adding Pools', () => {
		it('MUST add 2 SwapEdges for each Pool', async () => {
			const singlePool = [pools[0]]
			const graph = await GraphBuilder.buildFromPools(singlePool)

			const swapEdges = Array.from(graph.edges.values()).filter(
				(edge) => edge.type === ActionType.SWAP,
			)

			expect(swapEdges.length).toBe(2)
		})
		it('MUST add Nodes for each Pool', async () => {
			const singlePool = [pools[0]]
			const graph = await GraphBuilder.buildFromPools(singlePool)

			const swapEdges = Array.from(graph.edges.values()).filter(
				(edge) => edge.type === ActionType.SWAP,
			)

			expect(swapEdges.length).toBe(2)
		})
	})

	describe('Adding Native Currencies', () => {
		it('MUST add Native Currencies for Chain', async () => {
			const arbPool = pools.find((pool) => pool.chainId === arbitrum.id)

			const graph = await GraphBuilder.buildFromPools([arbPool!])

			const nativeCurrencies = Array.from(graph.nodes.values()).filter(
				(node) => node.isNative(),
			)

			expect(nativeCurrencies.length).toBe(1)
			expect(nativeCurrencies[0].chainId).toBe(arbitrum.id)
		})

		it('MUST add Native Currencies for Multiple Chain', async () => {
			const graph = await GraphBuilder.buildFromPools(pools)

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
		it('MUST add Wrapped Native Currencies for Chain', async () => {
			const fusePool = pools.find((pool) => pool.chainId === fuse.id)

			const graph = await GraphBuilder.buildFromPools([fusePool!])

			const wrappedNativeCurrencies = Array.from(
				graph.nodes.values(),
			).filter((node) => node instanceof WrappedNative)

			expect(wrappedNativeCurrencies.length).toBe(1)
			expect(wrappedNativeCurrencies[0].chainId).toBe(fuse.id)
		})

		it('MUST add Wrapped Native Currencies for Multiple Chain', async () => {
			const graph = await GraphBuilder.buildFromPools(pools)

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
})
