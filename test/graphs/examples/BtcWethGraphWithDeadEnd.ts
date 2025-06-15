import { arbitrum, fuse } from 'viem/chains'
import { Pool } from '../../../src/dex/Pool'
import { ActionType, Graph, GraphEdgeAction } from '../../../src/graphs/Graph'
import { TokenUtils } from '../../../src/primitives/tokens/TokenUtils'
import { safeMultiply } from '../../../src/utils/math'

export async function getWethWbtcFuseGraphWithDeadEnd(
	ethPoolPriceMultiplier: number = 1,
): Promise<Graph> {
	const WBTC_ARB_ADDR = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
	const USDT_ARB_ADDR = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' // Dead end
	const WETH_FUSE_ADDR = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
	const WBTC_FUSE_ADDR = '0x33284f95ccb7B948d9D352e1439561CF83d8d00d'

	const graph = new Graph()

	const ETH_ARB = TokenUtils.getNative(arbitrum.id)
	const FUSE_FUSE = TokenUtils.getNative(fuse.id)

	const WBTC_ARB = await TokenUtils.fromAddress(WBTC_ARB_ADDR, arbitrum.id)
	const WETH_FUSE = await TokenUtils.fromAddress(WETH_FUSE_ADDR, fuse.id)
	const WBTC_FUSE = await TokenUtils.fromAddress(WBTC_FUSE_ADDR, fuse.id)

	const USDT_ARB = await TokenUtils.fromAddress(USDT_ARB_ADDR, arbitrum.id)

	graph.addNode(ETH_ARB)
	graph.addNode(FUSE_FUSE)

	graph.addNode(WBTC_ARB)
	graph.addNode(WETH_FUSE)
	graph.addNode(WBTC_FUSE)

	// Trap node
	graph.addNode(USDT_ARB)

	const BTC_PRICE = 110_000
	const ETH_PRICE = 2_700

	// SWAP: ETH (ARB) <-> WBTC (ARB)
	graph.addEdge({
		from: ETH_ARB.id,
		to: WBTC_ARB.id,
		type: ActionType.SWAP,
		pool: {} as Pool,
		getRate: (amountIn: bigint) => {
			const price = ETH_PRICE / BTC_PRICE
			const rate = -Math.log(price)
			return {
				rate,
				amountOut: safeMultiply(amountIn, price),
			}
		},
	})
	graph.addEdge({
		from: WBTC_ARB.id,
		to: ETH_ARB.id,
		type: ActionType.SWAP,
		pool: {} as Pool,
		getRate: (amountIn: bigint) => {
			const price = BTC_PRICE / ETH_PRICE
			const rate = -Math.log(price)
			return {
				rate,
				amountOut: safeMultiply(amountIn, price),
			}
		},
	})

	// SWAP: WBTC (FUSE) -> WETH (FUSE)
	graph.addEdge({
		from: WBTC_FUSE.id,
		to: WETH_FUSE.id,
		type: ActionType.SWAP,
		pool: {} as Pool,
		getRate: (amountIn: bigint) => {
			const price = BTC_PRICE / ETH_PRICE / ethPoolPriceMultiplier
			const rate = -Math.log(price)
			return {
				rate,
				amountOut: safeMultiply(amountIn, price),
			}
		},
	})
	graph.addEdge({
		from: WETH_FUSE.id,
		to: WBTC_FUSE.id,
		type: ActionType.SWAP,
		pool: {} as Pool,
		getRate: (amountIn: bigint) => {
			const price = (ETH_PRICE * ethPoolPriceMultiplier) / BTC_PRICE
			const rate = -Math.log(price)
			return {
				rate,
				amountOut: safeMultiply(amountIn, price),
			}
		},
	})

	// STARGATE BRIDGE: ETH (ARB) <-> WETH (FUSE)
	const stargateBridgeAction: GraphEdgeAction = {
		type: ActionType.STARGATE_BRIDGE,
		getRate: (amountIn: bigint) => {
			return {
				rate: -Math.log(1),
				amountOut: amountIn,
			}
		},
	}

	graph.addEdge({
		from: ETH_ARB.id,
		to: WETH_FUSE.id,
		type: ActionType.STARGATE_BRIDGE,
		getRate: stargateBridgeAction.getRate,
	})
	graph.addEdge({
		from: WETH_FUSE.id,
		to: ETH_ARB.id,
		type: ActionType.STARGATE_BRIDGE,
		getRate: stargateBridgeAction.getRate,
	})

	// FUSE BRIDGE: WBTC (FUSE) <-> WBTC (ARB)
	const fuseBridgeAction: GraphEdgeAction = {
		type: ActionType.FUSE_BRIDGE,
		getRate: (amountIn: bigint) => {
			return {
				rate: -Math.log(1),
				amountOut: amountIn,
			}
		},
	}

	graph.addEdge({
		from: WBTC_FUSE.id,
		to: WBTC_ARB.id,
		type: ActionType.FUSE_BRIDGE,
		getRate: fuseBridgeAction.getRate,
	})
	graph.addEdge({
		from: WBTC_ARB.id,
		to: WBTC_FUSE.id,
		type: ActionType.FUSE_BRIDGE,
		getRate: fuseBridgeAction.getRate,
	})

	// Swap to USDT
	graph.addEdge({
		from: ETH_ARB.id,
		to: USDT_ARB.id,
		type: ActionType.SWAP,
		pool: {} as Pool,
		getRate: (amountIn: bigint) => {
			const price = ETH_PRICE
			return {
				rate: -Math.log(price),
				amountOut: safeMultiply(amountIn, price),
			}
		},
	})

	graph.addEdge({
		from: USDT_ARB.id,
		to: ETH_ARB.id,
		type: ActionType.SWAP,
		pool: {} as Pool,
		getRate: (amountIn: bigint) => {
			const price = 1 / ETH_PRICE
			return {
				rate: -Math.log(price),
				amountOut: safeMultiply(amountIn, price),
			}
		},
	})

	return graph
}
