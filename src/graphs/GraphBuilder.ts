import { StargateAPI, StargateAPIError } from '../bridges/stargate/StargateAPI'
import { Pool } from '../dex/Pool'
import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { WrappedNative } from '../primitives/tokens/WrappedNative'
import logger from '../utils/logger'
import { ActionType, Graph, GraphError, GraphNode } from './Graph'

export class GraphBuilderError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, GraphBuilderError.prototype)
		this.name = 'GraphBuilderError'
	}
}

/**
 * @dev Has overhead of adding all Native Currencies to the graph, even if they are not supposed to be used
 */
export class GraphBuilder {
	static async buildFromPools(
		pools: Pool[],
		slippage: number = 30,
	): Promise<Graph> {
		logger.info('--------------------------------')
		logger.info('Building Graph from Pools')
		logger.info('--------------------------------')

		if (!pools || pools.length === 0) {
			throw new GraphBuilderError('No pools provided')
		}

		const graph = new Graph()

		/* ================ Setup Pools (With Tokens) ================ */

		for (const pool of pools) {
			graph.addDexPool(pool, slippage)
			logger.info(
				`Added Pool ${pool.token0.symbol} <-> ${pool.token1.symbol} (${pool.chainId}) to Graph`,
			)
		}

		/* ================ Setup Native Currency and it's Wrapped Versions For Each Chain ================ */

		const nativeCurrencies = this.setupNativeCurrencies(graph, pools)
		await this.setupWrappedNativeCurrencies(graph, nativeCurrencies)

		/* ================ Setup Stargate Bridges ================ */

		// Identify Stargate Tokens and connect them in graph

		/* ================ Setup Fuse Bridges ================ */

		// this.setupFuseBridges(graph)

		/* ================ Report Result ================ */

		const uniqueChains = this.getAllUniqueChainIdsFromPools(pools)

		logger.info('--------------------------------')
		logger.info('Graph Built Successfully')
		logger.info('--------------------------------')

		logger.info(`Graph has ${graph.nodes.size} nodes`)
		logger.info(`Graph has ${graph.edges.size} edges`)
		logger.info(
			`Graph contains ${uniqueChains.length} (${uniqueChains.join(', ')}) chains`,
		)
		logger.info('--------------------------------')

		return graph
	}

	static setupNativeCurrencies(
		graph: Graph,
		pools: Pool[],
	): NativeCurrency[] {
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

	static async setupWrappedNativeCurrencies(
		graph: Graph,
		nativeCurrencies: NativeCurrency[],
	) {
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
					logger.warn(
						`Wrapped Native: ${wrapped.toString()} already exists`,
					)
				} else {
					throw error
				}
			}

			// ADD WRAP / UNWRAP

			const getWrapRate = (amountIn: bigint) => {
				return {
					rate: -Math.log(1),
					amountOut: amountIn,
				}
			}

			graph.addEdge({
				from: wrapped.native.id,
				to: wrapped.id,
				type: ActionType.WRAP,
				getRate: getWrapRate,
			})

			graph.addEdge({
				from: wrapped.id,
				to: wrapped.native.id,
				type: ActionType.UNWRAP,
				getRate: getWrapRate,
			})
		}
	}

	static async setupStargateBridges(graph: Graph) {
		logger.info('Setting up Stargate Bridges')

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
					logger.warn(
						`Stargate Token: ${token.toString()} not found in Stargate metadata`,
					)
				} else {
					throw error
				}
				continue
			}

			const assetId = Number(metadata.assetId)

			if (!assetGroups.has(assetId)) {
				assetGroups.set(assetId, new Set())
			}

			assetGroups.get(assetId)?.add(token)
		}

		logger.info(`Found ${assetGroups.size} asset groups`)

		const pairs: [GraphNode, GraphNode][] = []

		for (const assets of assetGroups.values()) {
			const tokens = Array.from(assets)

			for (let i = 0; i < tokens.length; i++) {
				for (let j = 0; j < tokens.length; j++) {
					if (tokens[i].id === tokens[j].id) continue

					pairs.push([tokens[i], tokens[j]])
				}
			}

			const assetGroupString = tokens
				.map((asset) => asset.toString())
				.join(' <--> ')

			logger.info(`Added ${assetGroupString} bridges`)
		}

		for (const pair of pairs) {
			graph.addStargateBridgeEdge(pair[0], pair[1])
		}
	}

	static getAllUniqueChainIdsFromPools(pools: Pool[]): number[] {
		return [...new Set(pools.map((pool) => pool.chainId))]
	}

	// static setupFuseBridges(graph: Graph) {
	// 	const fuseBridges: FuseBridge[] = []

	// 	const assetGroups

	// 	for (const node of graph.nodes) {
	// 		const bridge = new FuseBridge(chainId)
	// 		graph.addNode(bridge)
	// 	}
	// }
}
