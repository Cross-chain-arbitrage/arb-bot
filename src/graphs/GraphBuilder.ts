import { Cache } from '@nestjs/cache-manager'
import { Injectable, Logger } from '@nestjs/common'
import { fuse } from 'viem/chains'
import { FUSE_BRIDGE_SUPPORTED_TOKENS } from '../bridges/layerzero-bridges/fuse-bridge/fuse-bridge.constants'
import { FuseBridgeService } from '../bridges/layerzero-bridges/fuse-bridge/fuse-bridge.service'
import {
	StargateAPIError,
	StargateAPIService,
} from '../bridges/layerzero-bridges/stargate/stargate-api.service'
import { StargateService } from '../bridges/layerzero-bridges/stargate/stargate-service'
import { RelayService } from '../bridges/relay/relay-service'
import { ChainClientService } from '../chain-client/chain-client.service'
import { Pool } from '../dex/base/Pool'
import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { WrappedNative } from '../primitives/tokens/WrappedNative'
import { createCustomError } from '../utils/common'
import { Graph, GraphError } from './primitives/Graph'
import { FuseBridgeEdge } from './primitives/edges/crosschain/fuse-edge'
import { RelayBridgeEdge } from './primitives/edges/crosschain/relay-edge'
import { StargateBridgeEdge } from './primitives/edges/crosschain/stargate-edge'
import { Edge } from './primitives/edges/edge'
import { EdgeHelperService } from './primitives/edges/edge-helper.service'
import { SwapEdge } from './primitives/edges/inchain/swap-edge'
import { UnwrapEdge } from './primitives/edges/inchain/unwrap-edge'
import { WrapEdge } from './primitives/edges/inchain/wrap-edge'

export const GraphBuilderError = createCustomError('GraphBuilderError')

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

type EdgeType = 'wrap' | 'unwrap' | 'swap' | 'stargate' | 'fuse' | 'relay'

type AdditionalEdgeConfig = {
	from: GraphNode
	to: GraphNode
} & (
	| {
			type: Exclude<EdgeType, 'swap'>
	  }
	| {
			type: 'swap'
			pool: Pool
	  }
)

export interface GraphBuildConfig {
	/** The pools to build the graph from */
	pools: Pool[]
	/** If true, will connect all possible pairs of chains. Otherwise, will only connect base chain with all other chains */
	connectSecondaryChains: boolean
	/** The chain to connect to all other chains. Used only if `connectSecondaryChains` is false */
	baseChainId: number
	/** The slippage tolerance for the swaps */
	slippage?: number
	/** cache for calling getRate on edges */
	edgeCacheTTL?: number
	/** additional edges to add to the graph */
	additionalEdges?: AdditionalEdgeConfig[]
}

/**
 * Builds `Graph` from provided array of `Pool`s
 * @dev Finds all possible bridging opportunities by itself (Stargate and Fuse)
 * @dev Automatically adds all Native Currencies and their Wrapped Versions for all chains featured in provided `Pool`s
 * @returns Graph with all required Nodes and Edges, which is not supposed to be modified manually
 */

@Injectable()
export class GraphBuilder {
	constructor(
		private readonly tokenUtils: TokenUtils,
		private readonly chainClientService: ChainClientService,
		private readonly stargateService: StargateService,
		private readonly fuseBridgeService: FuseBridgeService,
		private readonly stargateAPIService: StargateAPIService,
		private readonly logger: Logger,
		private readonly edgeHelperService: EdgeHelperService,
		private readonly cacheService: Cache,
		private readonly relayService: RelayService,
	) {}

	/**
	 * Builds `Graph` from provided `GraphBuildConfig`
	 * @dev Finds all possible bridging opportunities by itself (Stargate and Fuse)
	 * @dev Automatically adds all Native Currencies and their Wrapped Versions for all chains featured in provided `Pool`s
	 * @returns Graph with all required Nodes and Edges, which is not supposed to be modified manually
	 */
	async build(buildConfig: GraphBuildConfig): Promise<Graph> {
		const { pools, connectSecondaryChains, baseChainId } = buildConfig

		this.logger.log('============================')
		this.logger.log('Building Graph from Pools')
		this.logger.log('============================')

		if (!pools || pools.length === 0) {
			throw new GraphBuilderError('No pools provided')
		}

		const graph = new Graph()

		/* ================ Setup Pools (With Tokens) ================ */

		this.setupPools(graph, pools)

		/* ================ Setup Native Currency and it's Wrapped Versions For Each Chain ================ */

		const nativeCurrencies = this.setupNativeCurrencies(graph, pools)
		await this.setupWrappedNativeCurrencies(graph, nativeCurrencies)

		/* ================ Setup Stargate Bridges ================ */

		await this.setupStargateBridges(graph, {
			connectSecondaryChains,
			baseChainId,
		})

		/* ================ Setup Fuse Bridges ================ */

		this.setupFuseBridges(graph)

		/* ================ Setup Additional Edges ================ */

		if (buildConfig.additionalEdges) {
			this.setupAdditionalEdges(graph, buildConfig.additionalEdges)
		}

		/* ================ Report Result ================ */

		const uniqueChains = this.getAllUniqueChainIdsFromPools(pools).map(
			(chainId) => this.chainClientService.getChainNameById(chainId),
		)

		this.logger.log('============================')
		this.logger.log('Graph Built Successfully')
		this.logger.log('============================')

		this.logger.log(`Graph has ${graph.nodes.size} nodes`)
		this.logger.log(`Graph has ${graph.edges.size} edges`)
		this.logger.log(
			`Graph contains ${uniqueChains.length} (${uniqueChains.join(', ')}) chains`,
		)
		this.logger.log('============================')

		return graph
	}

	setupNativeCurrencies(graph: Graph, pools: Pool[]): NativeCurrency[] {
		this.logger.log('------ Setting up Native Currencies ------')

		const uniqueChains = this.getAllUniqueChainIdsFromPools(pools)

		const nativeCurrencies: NativeCurrency[] = []

		for (const chainId of uniqueChains) {
			const nativeCurrency = this.tokenUtils.getNative(chainId)
			graph.addNode(nativeCurrency)
			nativeCurrencies.push(nativeCurrency)

			this.logger.log(
				`Added Native Currency: ${nativeCurrency.toString()}`,
			)
		}

		return nativeCurrencies
	}

	private async setupWrappedNativeCurrencies(
		graph: Graph,
		nativeCurrencies: NativeCurrency[],
	) {
		this.logger.log('------ Setting up Wrapped Native Currencies ------')

		const wrappedNativeCurrencies: WrappedNative[] = await Promise.all(
			nativeCurrencies.map((native) =>
				this.tokenUtils.getWrappedNative(native.chainId),
			),
		)

		for (const wrapped of wrappedNativeCurrencies) {
			try {
				graph.addNode(wrapped)

				this.logger.log(`Added Wrapped Native: ${wrapped.toString()}`)
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
			graph.addEdge(
				new WrapEdge(
					wrapped.native,
					wrapped,
					this.edgeHelperService,
					this.cacheService,
				),
			)

			graph.addEdge(
				new UnwrapEdge(
					wrapped.native,
					wrapped,
					this.edgeHelperService,
					this.cacheService,
				),
			)
		}
	}

	private async setupStargateBridges(
		graph: Graph,
		stargateConfig: StargateConfig,
	) {
		const { connectSecondaryChains, baseChainId } = stargateConfig
		this.logger.log('------ Setting up Stargate Bridges ------')

		type AssetId = number

		const assetGroups: Map<AssetId, Set<GraphNode>> = new Map()

		const tokensArray = Array.from(graph.nodes.values())

		for (const token of tokensArray) {
			let metadata: StargateTokenMetadata

			try {
				metadata = await this.stargateAPIService.getTokenMetadata(token)
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

		this.logger.log(`Found ${assetGroups.size} asset group(s)`)

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

			this.logger.log(`Added ${assetGroupString} bridges`)
		}

		for (const pair of pairs) {
			graph.addEdge(
				new StargateBridgeEdge(
					pair[0],
					pair[1],
					this.stargateService,
					this.chainClientService,
					this.edgeHelperService,
					this.cacheService,
				),
			)
		}
	}

	private setupFuseBridges(graph: Graph) {
		this.logger.log('------ Setting up Fuse Bridges ------')

		type AssetId = string

		const assetGroups: Map<AssetId, Set<GraphNode>> = new Map()

		for (const node of graph.nodes.values()) {
			const supportedTokens = FUSE_BRIDGE_SUPPORTED_TOKENS.map(
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

		this.logger.log(`Found ${assetGroups.size} asset group(s)`)

		// Handle FUSE tokens specially
		const fuseAssets = assetGroups.get('FUSE')
		const wfuseAssets = assetGroups.get('WFUSE')

		if (fuseAssets && wfuseAssets) {
			const wfuseToken = Array.from(wfuseAssets)[0] // Only one WFUSE token
			const fuseOnOtherChains = Array.from(fuseAssets).filter(
				(token) => token.chainId !== fuse.id,
			)
			const nativeFuseOnFuse = Array.from(fuseAssets).find(
				(token) => token.chainId === fuse.id,
			)

			// FUSE from other chains → WFUSE on Fuse
			for (const fuseToken of fuseOnOtherChains) {
				graph.addEdge(
					new FuseBridgeEdge(
						fuseToken,
						wfuseToken,
						this.fuseBridgeService,
						this.chainClientService,
						this.edgeHelperService,
						this.cacheService,
					),
				)
				this.logger.log(
					`Added bridge: ${fuseToken.toString()} --> ${wfuseToken.toString()}`,
				)
			}

			// Native FUSE on Fuse → FUSE on other chains
			if (nativeFuseOnFuse) {
				for (const fuseToken of fuseOnOtherChains) {
					graph.addEdge(
						new FuseBridgeEdge(
							nativeFuseOnFuse,
							fuseToken,
							this.fuseBridgeService,
							this.chainClientService,
							this.edgeHelperService,
							this.cacheService,
						),
					)
					this.logger.log(
						`Added bridge: ${nativeFuseOnFuse.toString()} --> ${fuseToken.toString()}`,
					)
				}
			}

			// Remove FUSE and WFUSE from regular processing
			assetGroups.delete('FUSE')
			assetGroups.delete('WFUSE')
		}

		// Handle other tokens with original logic
		for (const assets of assetGroups.values()) {
			const tokens = Array.from(assets)

			const tokenOnFuse = tokens.find(
				(token) => token.chainId === fuse.id,
			)

			if (!tokenOnFuse) {
				continue
			}

			for (const token of tokens) {
				if (token.chainId === fuse.id) continue

				graph.addEdge(
					new FuseBridgeEdge(
						token,
						tokenOnFuse,
						this.fuseBridgeService,
						this.chainClientService,
						this.edgeHelperService,
						this.cacheService,
					),
				)
				graph.addEdge(
					new FuseBridgeEdge(
						tokenOnFuse,
						token,
						this.fuseBridgeService,
						this.chainClientService,
						this.edgeHelperService,
						this.cacheService,
					),
				)
			}

			const assetGroupString = tokens
				.map((asset) => asset.toString())
				.join(' <--> ')

			this.logger.log(`Added ${assetGroupString} bridges`)
		}
	}

	private getAllUniqueChainIdsFromPools(pools: Pool[]): number[] {
		return [...new Set(pools.map((pool) => pool.chainId))]
	}

	private setupPools(graph: Graph, pools: Pool[]) {
		for (const pool of pools) {
			const from = pool.token0
			const to = pool.token1

			if (!graph.isNodeAdded(from.id)) {
				graph.addNode(from)
			}
			if (!graph.isNodeAdded(to.id)) {
				graph.addNode(to)
			}

			graph.addEdge(
				new SwapEdge(
					from,
					to,
					pool,
					this.edgeHelperService,
					this.cacheService,
				),
			)
			graph.addEdge(
				new SwapEdge(
					to,
					from,
					pool,
					this.edgeHelperService,
					this.cacheService,
				),
			)

			this.logger.log(
				`Added Pool ${pool.token0.symbol} <-> ${pool.token1.symbol} (${this.chainClientService.getChainNameById(pool.chainId)})`,
			)
		}
	}

	private setupAdditionalEdges(
		graph: Graph,
		additionalEdges: AdditionalEdgeConfig[],
	) {
		for (const edgeConfig of additionalEdges) {
			if (!graph.isNodeAdded(edgeConfig.from.id)) {
				graph.addNode(edgeConfig.from)
			}
			if (!graph.isNodeAdded(edgeConfig.to.id)) {
				graph.addNode(edgeConfig.to)
			}

			const edge = this.createEdge(edgeConfig)
			graph.addEdge(edge)
		}
	}

	private createEdge(edgeConfig: AdditionalEdgeConfig): Edge {
		switch (edgeConfig.type) {
			case 'wrap':
				return new WrapEdge(
					edgeConfig.from,
					edgeConfig.to,
					this.edgeHelperService,
					this.cacheService,
				)
			case 'unwrap':
				return new UnwrapEdge(
					edgeConfig.from,
					edgeConfig.to,
					this.edgeHelperService,
					this.cacheService,
				)
			case 'swap':
				return new SwapEdge(
					edgeConfig.from as Token,
					edgeConfig.to as Token,
					edgeConfig.pool,
					this.edgeHelperService,
					this.cacheService,
				)
			case 'stargate':
				return new StargateBridgeEdge(
					edgeConfig.from,
					edgeConfig.to,
					this.stargateService,
					this.chainClientService,
					this.edgeHelperService,
					this.cacheService,
				)
			case 'fuse':
				return new FuseBridgeEdge(
					edgeConfig.from,
					edgeConfig.to,
					this.fuseBridgeService,
					this.chainClientService,
					this.edgeHelperService,
					this.cacheService,
				)
			case 'relay':
				return new RelayBridgeEdge(
					edgeConfig.from,
					edgeConfig.to,
					this.chainClientService,
					this.relayService,
					this.cacheService,
				)
		}
	}
}
