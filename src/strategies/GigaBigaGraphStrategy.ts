import { arbitrum, fuse, hemi, lightlinkPhoenix } from 'viem/chains'
import { StargateAPI } from '../bridges/stargate/StargateAPI'
import { Pool } from '../dex/Pool'
import { PoolUtils } from '../dex/PoolUtils'
import { ActionType, Graph, GraphNode } from '../graphs/Graph'
import { findArbitragePath } from '../graphs/path'
import { prettyPrintPath } from '../graphs/utils'
import { poolsByChain } from '../pools'
import { Token } from '../primitives/tokens/Token'
import { TokenUtils } from '../primitives/tokens/TokenUtils'

/* ============ Tokens ============ */

const WBTC_ARB_ADDR = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
const WETH_ARB_ADDR = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
const WETH_FUSE_ADDR = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
const WBTC_FUSE_ADDR = '0x34009565bfEeFded0F7e774629a745636Bf35E82'

/* ============ Constants ============ */

const SLIPPAGE = 50
const MAX_PATH_LENGTH = 7

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

		const tokens: Map<string, Token> = new Map()

		for (const pool of pools) {
			if (!tokens.has(pool.token0.id)) {
				tokens.set(pool.token0.id, pool.token0)
			}
			if (!tokens.has(pool.token1.id)) {
				tokens.set(pool.token1.id, pool.token1)
			}
		}

		console.log('tokens', tokens.size)
		// console.log('tokens', tokens)

		const tokensArray = Array.from(tokens.values())

		// console.log('tokensArray', tokensArray)
		// console.log('tokensArray', tokensArray.length)

		/* =============== NODES =============== */

		for (const token of tokensArray) {
			console.log('adding token', token.id)
			graph.addNode(token)
		}

		console.log('nodes', graph.nodes.size)
		console.log('nodes', graph.nodes)

		/* =============== NATIVE TOKENS =============== */

		const ETH_ARB = TokenUtils.getNative(arbitrum.id)
		const ETH_LIGHTLINK = TokenUtils.getNative(lightlinkPhoenix.id)
		const ETH_HEMI = TokenUtils.getNative(hemi.id)

		graph.addNode(ETH_ARB)
		graph.addNode(ETH_LIGHTLINK)
		graph.addNode(ETH_HEMI)

		/* =============== SWAPS =============== */

		for (const pool of pools) {
			const token0 = tokens.get(pool.token0.id)
			const token1 = tokens.get(pool.token1.id)

			if (token0 && token1) {
				graph.addSwapEdge(token0, token1, pool, SLIPPAGE)
			} else {
				throw new Error(
					`one of tokens doesn't exist in graph: ${pool.token0.id} or ${pool.token1.id}`,
				)
			}
		}

		/* =============== STARGATE BRIDGES =============== */

		type AssetId = number

		const assetGroups: Map<AssetId, Set<GraphNode>> = new Map()

		for (const token of tokensArray) {
			let metadata: StargateTokenMetadata

			try {
				metadata = await StargateAPI.getTokenMetadata(token)
				console.log('Found Stargate token', token.toString())
			} catch (error) {
				console.log(`${token.toString()} is not a stargate token`)
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
				for (let j = i + 1; j < tokens.length; j++) {
					pairs.push([tokens[i], tokens[j]])
				}
			}
		}

		console.log('pairs.length', pairs.length)

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
			from: WBTC_FUSE,
			to: WBTC_ARB,
			type: ActionType.FUSE_BRIDGE,
			getRate: getFuseBridgeRate,
		})
		graph.addEdge({
			from: WBTC_ARB,
			to: WBTC_FUSE,
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
			from: WETH_ARB,
			to: ETH_ARB,
			type: ActionType.UNWRAP,
			getRate: getWrapRate,
		})

		graph.addEdge({
			from: ETH_ARB,
			to: WETH_ARB,
			type: ActionType.WRAP,
			getRate: getWrapRate,
		})

		graph.addEdge({
			from: WETH_LIGHTLINK,
			to: ETH_LIGHTLINK,
			type: ActionType.UNWRAP,
			getRate: getWrapRate,
		})

		graph.addEdge({
			from: ETH_LIGHTLINK,
			to: WETH_LIGHTLINK,
			type: ActionType.WRAP,
			getRate: getWrapRate,
		})

		graph.addEdge({
			from: WETH_HEMI,
			to: ETH_HEMI,
			type: ActionType.UNWRAP,
			getRate: getWrapRate,
		})

		graph.addEdge({
			from: ETH_HEMI,
			to: WETH_HEMI,
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

	await prettyPrintPath(
		ETH_ARB,
		ETH_ARB.parseUnits('0.0001'),
		path,
		edgesWithRate,
	)
}
void main()
