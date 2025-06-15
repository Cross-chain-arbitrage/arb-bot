import { arbitrum, fuse, hemi, lightlinkPhoenix } from 'viem/chains'
import { StargateAPI } from '../bridges/stargate/StargateAPI'
import { Pool } from '../dex/Pool'
import { PoolUtils } from '../dex/PoolUtils'
import { ActionType, Graph, GraphNode } from '../graphs/Graph'
import { findArbitragePath } from '../graphs/path'
import { prettyPrintPath, printGraph } from '../graphs/utils'
import { poolsByChain } from '../pools'
import { Token } from '../primitives/tokens/Token'
import { TokenId } from '../primitives/tokens/TokenBase'
import { TokenUtils } from '../primitives/tokens/TokenUtils'

/* ============ Tokens ============ */

const WBTC_ARB_ADDR = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
const WBTC_FUSE_ADDR = '0x34009565bfEeFded0F7e774629a745636Bf35E82'

/* ============ Constants ============ */

const SLIPPAGE = 50
const MAX_PATH_LENGTH = 5

/* ============ Strategy ============ */
export class GigaBigaGraphStrategy {
	constructor(public readonly graph: Graph) {}

	static async setup(): Promise<GigaBigaGraphStrategy> {
		const graph = new Graph()

		const poolPromises: Promise<Pool>[] = []

		for (const chainId in poolsByChain) {
			const pools = poolsByChain[chainId]

			for (const pool of pools) {
				const poolPromise = PoolUtils.createPool(
					pool.address,
					Number(chainId),
					pool.type,
				)

				poolPromises.push(poolPromise)
			}
		}

		const pools = await Promise.all(poolPromises)

		console.log('pools', pools.length)

		const tokens: Map<TokenId, Token> = new Map()

		for (const pool of pools) {
			if (!tokens.has(pool.token0.id)) {
				tokens.set(pool.token0.id, pool.token0)
			}
			if (!tokens.has(pool.token1.id)) {
				tokens.set(pool.token1.id, pool.token1)
			}
		}

		const tokensArray = Array.from(tokens.values())

		/* =============== NODES =============== */

		for (const token of tokensArray) {
			graph.addNode(token)
		}

		/* =============== NATIVE TOKENS =============== */

		const ETH_ARB = TokenUtils.getNative(arbitrum.id)
		const ETH_LIGHTLINK = TokenUtils.getNative(lightlinkPhoenix.id)
		const ETH_HEMI = TokenUtils.getNative(hemi.id)

		graph.addNode(ETH_ARB)
		graph.addNode(ETH_LIGHTLINK)
		graph.addNode(ETH_HEMI)

		/* =============== SWAPS =============== */

		for (const pool of pools) {
			graph.addDexPool(pool, SLIPPAGE)
		}

		/* =============== STARGATE BRIDGES =============== */

		type AssetId = number

		const assetGroups: Map<AssetId, Set<GraphNode>> = new Map()

		for (const token of tokensArray) {
			let metadata: StargateTokenMetadata

			try {
				metadata = await StargateAPI.getTokenMetadata(token)
			} catch (error) {
				continue
			}

			const assetId = Number(metadata.assetId)

			if (!assetGroups.has(assetId)) {
				assetGroups.set(assetId, new Set())
			}

			assetGroups.get(assetId)?.add(token)
		}

		const pairs: [GraphNode, GraphNode][] = []

		for (const assets of assetGroups.values()) {
			const tokens = Array.from(assets)

			for (let i = 0; i < tokens.length; i++) {
				for (let j = 0; j < tokens.length; j++) {
					if (tokens[i].id === tokens[j].id) continue

					pairs.push([tokens[i], tokens[j]])
				}
			}
		}

		for (const pair of pairs) {
			graph.addStargateBridgeEdge(pair[0], pair[1])
		}

		/* =============== FUSE BRIDGES =============== */

		const getFuseBridgeRate = (amountIn: bigint) => {
			return {
				rate: -Math.log(1),
				amountOut: amountIn,
			}
		}

		const WBTC_FUSE = await TokenUtils.fromAddress(WBTC_FUSE_ADDR, fuse.id)
		const WBTC_ARB = await TokenUtils.fromAddress(
			WBTC_ARB_ADDR,
			arbitrum.id,
		)

		graph.addEdge({
			from: WBTC_FUSE.id,
			to: WBTC_ARB.id,
			type: ActionType.FUSE_BRIDGE,
			getRate: getFuseBridgeRate,
		})
		graph.addEdge({
			from: WBTC_ARB.id,
			to: WBTC_FUSE.id,
			type: ActionType.FUSE_BRIDGE,
			getRate: getFuseBridgeRate,
		})

		/* ============ WRAP/UNWRAP ============ */

		const getWrapRate = (amountIn: bigint) => {
			return {
				rate: -Math.log(1),
				amountOut: amountIn,
			}
		}

		const WETH_ARB = TokenUtils.getWrappedNative(arbitrum.id)
		const WETH_LIGHTLINK = TokenUtils.getWrappedNative(lightlinkPhoenix.id)
		const WETH_HEMI = TokenUtils.getWrappedNative(hemi.id)

		graph.addEdge({
			from: WETH_ARB.id,
			to: ETH_ARB.id,
			type: ActionType.UNWRAP,
			getRate: getWrapRate,
		})

		graph.addEdge({
			from: ETH_ARB.id,
			to: WETH_ARB.id,
			type: ActionType.WRAP,
			getRate: getWrapRate,
		})

		graph.addEdge({
			from: WETH_LIGHTLINK.id,
			to: ETH_LIGHTLINK.id,
			type: ActionType.UNWRAP,
			getRate: getWrapRate,
		})

		graph.addEdge({
			from: ETH_LIGHTLINK.id,
			to: WETH_LIGHTLINK.id,
			type: ActionType.WRAP,
			getRate: getWrapRate,
		})

		graph.addEdge({
			from: WETH_HEMI.id,
			to: ETH_HEMI.id,
			type: ActionType.UNWRAP,
			getRate: getWrapRate,
		})

		graph.addEdge({
			from: ETH_HEMI.id,
			to: WETH_HEMI.id,
			type: ActionType.WRAP,
			getRate: getWrapRate,
		})

		return new GigaBigaGraphStrategy(graph)
	}

	async findPath(startToken: GraphNode, startAmount: bigint) {
		const path = await findArbitragePath(
			startToken,
			startAmount,
			this.graph,
			MAX_PATH_LENGTH,
		)

		return path
	}
}

async function main() {
	const strategy = await GigaBigaGraphStrategy.setup()

	const ETH_ARB = TokenUtils.getNative(arbitrum.id)

	const { path, edgesWithRate } = await strategy.findPath(
		ETH_ARB,
		ETH_ARB.parseUnits('0.1'),
	)

	console.log('Nodes:', strategy.graph.nodes.size)
	console.log('Edges:', strategy.graph.edges.size)

	printGraph(strategy.graph)

	await prettyPrintPath(
		ETH_ARB,
		ETH_ARB.parseUnits('0.0001'),
		path,
		edgesWithRate,
	)
}
void main()
