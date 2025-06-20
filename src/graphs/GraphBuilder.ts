import { arbitrum, fuse } from 'viem/chains'
import { FuseBridge } from '../bridges/FuseBridge/FuseBridge'
import { StargateAPI, StargateAPIError } from '../bridges/stargate/StargateAPI'
import { Pool } from '../dex/Pool'
import { ChainUtils } from '../primitives/chains/ChainUtils'
import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { WrappedNative } from '../primitives/tokens/WrappedNative'
import logger from '../utils/logger'
import {
	FuseBridgeEdge,
	StargateBridgeEdge,
	UnwrapEdge,
	WrapEdge,
} from './primitives/Edge'
import { Graph, GraphError } from './primitives/Graph'

export class GraphBuilderError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, GraphBuilderError.prototype)
		this.name = 'GraphBuilderError'
	}
}

/**
 * Configuration for Stargate bridge connections
 * @interface
 */
interface StargateConfig {
	/** If true, will connect all possible pairs of chains. Otherwise, will only connect base chain with all other chains */
	connectSecondaryChains: boolean
	/** The chain to connect to all other chains. Used only if `connectSecondaryChains` is false */
	baseChainId: number
}

/**
 * Configuration for building a graph
 * @interface
 * @extends {StargateConfig}
 */
export interface GraphBuildConfig {
	/** The pools to build the graph from */
	pools: Pool[]
	/** The configuration for the Stargate bridges */
	stargateConfig?: StargateConfig
	/** The slippage tolerance for the swaps */
	slippage?: number
	/** cache for calling getRate on swap edges */
	swapCacheTTL?: number
}

/**
 * Builds `Graph` from provided array of `Pool`s
 * @dev Finds all possible bridging opportunities by itself (Stargate and Fuse)
 * @dev Automatically adds all Native Currencies and their Wrapped Versions for all chains featured in provided `Pool`s
 * @returns Graph with all required Nodes and Edges, which is not supposed to be modified manually
 */
export class GraphBuilder {
	/**
	 * Builds `Graph` from provided `GraphBuildConfig`
	 * @dev Finds all possible bridging opportunities by itself (Stargate and Fuse)
	 * @dev Automatically adds all Native Currencies and their Wrapped Versions for all chains featured in provided `Pool`s
	 * @returns Graph with all required Nodes and Edges, which is not supposed to be modified manually
	 */
	static async build(buildConfig: GraphBuildConfig): Promise<Graph> {
		const {
			pools,
			stargateConfig = {
				connectSecondaryChains: true,
				baseChainId: arbitrum.id,
			},
			slippage = 30,
		} = buildConfig

		logger.info('============================')
		logger.info('Building Graph from Pools')
		logger.info('============================')

		if (!pools || pools.length === 0) {
			throw new GraphBuilderError('No pools provided')
		}

		const graph = new Graph()

		/* ================ Setup Pools (With Tokens) ================ */

		for (const pool of pools) {
			graph.addDexPool(pool)
			logger.info(
				`Added Pool ${pool.token0.symbol} <-> ${pool.token1.symbol} (${ChainUtils.getChainNameById(pool.chainId)})`,
			)
		}

		/* ================ Setup Native Currency and it's Wrapped Versions For Each Chain ================ */

		const nativeCurrencies = this.setupNativeCurrencies(graph, pools)
		await this.setupWrappedNativeCurrencies(graph, nativeCurrencies)

		/* ================ Setup Stargate Bridges ================ */

		await this.setupStargateBridges(graph, stargateConfig)

		/* ================ Setup Fuse Bridges ================ */

		this.setupFuseBridges(graph)

		/* ================ Report Result ================ */

		const uniqueChains = this.getAllUniqueChainIdsFromPools(pools).map(
			(chainId) => ChainUtils.getChainNameById(chainId),
		)

		logger.info('============================')
		logger.info('Graph Built Successfully')
		logger.info('============================')

		logger.info(`Graph has ${graph.nodes.size} nodes`)
		logger.info(`Graph has ${graph.edges.size} edges`)
		logger.info(
			`Graph contains ${uniqueChains.length} (${uniqueChains.join(', ')}) chains`,
		)
		logger.info('============================')

		return graph
	}

	static setupNativeCurrencies(
		graph: Graph,
		pools: Pool[],
	): NativeCurrency[] {
		logger.info('------ Setting up Native Currencies ------')

		const uniqueChains = this.getAllUniqueChainIdsFromPools(pools)

		const nativeCurrencies: NativeCurrency[] = []

		for (const chainId of uniqueChains) {
			const nativeCurrency = TokenUtils.getNative(chainId)
			graph.addNode(nativeCurrency)
			nativeCurrencies.push(nativeCurrency)

			logger.info(`Added Native Currency: ${nativeCurrency.toString()}`)
		}

		return nativeCurrencies
	}

	private static async setupWrappedNativeCurrencies(
		graph: Graph,
		nativeCurrencies: NativeCurrency[],
	) {
		logger.info('------ Setting up Wrapped Native Currencies ------')

		const wrappedNativeCurrencies: WrappedNative[] = await Promise.all(
			nativeCurrencies.map((native) =>
				TokenUtils.getWrappedNative(native.chainId),
			),
		)

		for (const wrapped of wrappedNativeCurrencies) {
			try {
				graph.addNode(wrapped)

				logger.info(`Added Wrapped Native: ${wrapped.toString()}`)
			} catch (error) {
				if (error instanceof GraphError) {
					continue
				} else {
					throw error
				}
			}
		}

		// ADD WRAP / UNWRAP
		for (const wrapped of wrappedNativeCurrencies) {
			graph.addEdge(new WrapEdge(wrapped.native, wrapped, graph))

			graph.addEdge(new UnwrapEdge(wrapped, wrapped.native, graph))
		}
	}

	private static async setupStargateBridges(
		graph: Graph,
		stargateConfig: StargateConfig,
	) {
		const { connectSecondaryChains, baseChainId } = stargateConfig
		logger.info('------ Setting up Stargate Bridges ------')

		type AssetId = number

		const assetGroups: Map<AssetId, Set<GraphNode>> = new Map()

		const tokensArray = Array.from(graph.nodes.values())

		for (const token of tokensArray) {
			let metadata: StargateTokenMetadata

			try {
				metadata = await StargateAPI.getTokenMetadata(token)
			} catch (error) {
				if (
					error instanceof StargateAPIError &&
					error.message.includes('not found')
				) {
					continue
				} else {
					throw error
				}
			}

			const assetId = Number(metadata.assetId)

			if (!assetGroups.has(assetId)) {
				assetGroups.set(assetId, new Set())
			}

			assetGroups.get(assetId)?.add(token)
		}

		logger.info(`Found ${assetGroups.size} asset group(s)`)

		const pairs: [GraphNode, GraphNode][] = []

		for (const assets of assetGroups.values()) {
			const tokens = Array.from(assets)

			for (let i = 0; i < tokens.length; i++) {
				for (let j = 0; j < tokens.length; j++) {
					if (tokens[i].id === tokens[j].id) continue

					// Skip pair if there's no token on the base chain
					if (
						!connectSecondaryChains &&
						tokens[i].chainId !== baseChainId &&
						tokens[j].chainId !== baseChainId
					)
						continue

					pairs.push([tokens[i], tokens[j]])
				}
			}

			const assetGroupString = tokens
				.map((asset) => asset.toString())
				.join(' <--> ')

			logger.info(`Added ${assetGroupString} bridges`)
		}

		for (const pair of pairs) {
			graph.addEdge(new StargateBridgeEdge(pair[0], pair[1], graph))
		}
	}

	private static setupFuseBridges(graph: Graph) {
		logger.info('------ Setting up Fuse Bridges ------')

		type AssetId = string

		const assetGroups: Map<AssetId, Set<GraphNode>> = new Map()

		for (const node of graph.nodes.values()) {
			const supportedTokens = FuseBridge.SUPPORTED_TOKENS.map(
				(token) => `${token.chainId}:${token.address.toLowerCase()}`,
			)

			if (supportedTokens.includes(node.id)) {
				const assetId = node.symbol

				if (!assetGroups.has(assetId)) {
					assetGroups.set(assetId, new Set())
				}

				assetGroups.get(assetId)?.add(node)
			}
		}

		logger.info(`Found ${assetGroups.size} asset group(s)`)

		for (const assets of assetGroups.values()) {
			const tokens = Array.from(assets)

			const tokenOnFuse = tokens.find(
				(token) => token.chainId === fuse.id,
			)

			// If there is no Token on Fuse, skip
			if (!tokenOnFuse) {
				continue
			}

			for (const token of tokens) {
				if (token.chainId === fuse.id) continue

				graph.addEdge(new FuseBridgeEdge(token, tokenOnFuse, graph))

				graph.addEdge(new FuseBridgeEdge(tokenOnFuse, token, graph))
			}

			const assetGroupString = tokens
				.map((asset) => asset.toString())
				.join(' <--> ')

			logger.info(`Added ${assetGroupString} bridges`)
		}
	}

	private static getAllUniqueChainIdsFromPools(pools: Pool[]): number[] {
		return [...new Set(pools.map((pool) => pool.chainId))]
	}
}
