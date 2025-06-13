import { arbitrum, fuse } from 'viem/chains'
import { PoolType, PoolUtils } from '../dex/PoolUtils'
import { ActionType, Graph, GraphNode } from '../graphs/Graph'
import { findArbitragePath } from '../graphs/path'
import { TokenUtils } from '../primitives/tokens/TokenUtils'

/* ============ Tokens ============ */

const WBTC_ARB_ADDR = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
const WETH_ARB_ADDR = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
const WETH_FUSE_ADDR = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
const WBTC_FUSE_ADDR = '0x34009565bfEeFded0F7e774629a745636Bf35E82'

/* ============ Pools ============ */

const FUSE_POOL = '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992'
const FUSE_POOL_TYPE = PoolType.ALGEBRA
const ARB_POOL = '0x2f5e87C9312fa29aed5c179E456625D79015299c'
const ARB_POOL_TYPE = PoolType.UNIV3

/* ============ Constants ============ */
const SLIPPAGE = 50
const MAX_PATH_LENGTH = 5

/* ============ Strategy ============ */
export class FuseWbtcGraphStrategy {
	constructor(public readonly graph: Graph) {}

	static async setup(): Promise<FuseWbtcGraphStrategy> {
		const graph = new Graph()

		const ETH_ARB = TokenUtils.getNative(arbitrum.id)

		const promises = [
			TokenUtils.fromAddress(WBTC_ARB_ADDR, arbitrum.id),
			TokenUtils.fromAddress(WETH_FUSE_ADDR, fuse.id),
			TokenUtils.fromAddress(WETH_ARB_ADDR, arbitrum.id),
			TokenUtils.fromAddress(WBTC_FUSE_ADDR, fuse.id),
		]

		await Promise.all(promises)

		const WBTC_ARB = await promises[0]
		const WETH_FUSE = await promises[1]
		const WETH_ARB = await promises[2]
		const WBTC_FUSE = await promises[3]

		graph.addNode(ETH_ARB)
		graph.addNode(WBTC_ARB)
		graph.addNode(WETH_FUSE)
		graph.addNode(WBTC_FUSE)
		graph.addNode(WETH_ARB)

		const arbPool = await PoolUtils.createPool(
			ARB_POOL,
			arbitrum.id,
			ARB_POOL_TYPE,
		)
		const fusePool = await PoolUtils.createPool(
			FUSE_POOL,
			fuse.id,
			FUSE_POOL_TYPE,
		)

		/* ============ SWAP: WETH (ARB) <-> WBTC (ARB) ============ */

		graph.addSwapEdge(WETH_ARB, WBTC_ARB, arbPool, SLIPPAGE)

		graph.addSwapEdge(WBTC_ARB, WETH_ARB, arbPool, SLIPPAGE)

		/* ============ SWAP: WBTC (FUSE) <-> WETH (FUSE) ============ */

		graph.addSwapEdge(WBTC_FUSE, WETH_FUSE, fusePool, SLIPPAGE)

		graph.addSwapEdge(WETH_FUSE, WBTC_FUSE, fusePool, SLIPPAGE)

		/* ============ STARGATE BRIDGE: ETH (ARB) <-> WETH (FUSE) ============ */
		const getStargateBridgeRate = (amountIn: bigint) => {
			return {
				rate: -Math.log(1),
				amountOut: amountIn,
			}
		}

		graph.addEdge({
			from: ETH_ARB,
			to: WETH_FUSE,
			type: ActionType.STARGATE_BRIDGE,
			getRate: getStargateBridgeRate,
		})
		graph.addEdge({
			from: WETH_FUSE,
			to: ETH_ARB,
			type: ActionType.STARGATE_BRIDGE,
			getRate: getStargateBridgeRate,
		})

		/* ============ FUSE BRIDGE: WBTC (FUSE) <-> WBTC (ARB) ============ */
		const getFuseBridgeRate = (amountIn: bigint) => {
			return {
				rate: -Math.log(1),
				amountOut: amountIn,
			}
		}

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

		/* ============ WRAP/UNWRAP: WETH (ARB) <-> ETH (ARB) ============ */

		const getWrapRate = (amountIn: bigint) => {
			return {
				rate: -Math.log(1),
				amountOut: amountIn,
			}
		}

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

		return new FuseWbtcGraphStrategy(graph)
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
