import { arbitrum, fuse } from 'viem/chains'
import { ActionType, Graph, GraphEdgeAction } from '../../../src/graphs/Graph'
import { TokenUtils } from '../../../src/primitives/tokens/TokenUtils'
import { safeMultiply } from '../../../src/utils/math'

export async function getWethWbtcFuseGraph(
	ethPoolPriceMultiplier: number = 1,
): Promise<Graph> {
	const WBTC_ARB_ADDR = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
	const WETH_FUSE_ADDR = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
	const WBTC_FUSE_ADDR = '0x33284f95ccb7B948d9D352e1439561CF83d8d00d'

	const graph = new Graph()

	const ETH_ARB = await TokenUtils.getNative(arbitrum.id)
	const FUSE_FUSE = await TokenUtils.getNative(fuse.id)

	const WBTC_ARB = await TokenUtils.fromAddress(WBTC_ARB_ADDR, arbitrum.id)
	const WETH_FUSE = await TokenUtils.fromAddress(WETH_FUSE_ADDR, fuse.id)
	const WBTC_FUSE = await TokenUtils.fromAddress(WBTC_FUSE_ADDR, fuse.id)

	graph.addNode(ETH_ARB)
	graph.addNode(FUSE_FUSE)

	graph.addNode(WBTC_ARB)
	graph.addNode(WETH_FUSE)
	graph.addNode(WBTC_FUSE)

	const BTC_PRICE = 110_000
	const ETH_PRICE = 2_700

	// SWAP: ETH (ARB) <-> WBTC (ARB)
	graph.addEdge({
		from: ETH_ARB,
		to: WBTC_ARB,
		type: ActionType.SWAP,
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
		from: WBTC_ARB,
		to: ETH_ARB,
		type: ActionType.SWAP,
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
		from: WBTC_FUSE,
		to: WETH_FUSE,
		type: ActionType.SWAP,
		getRate: (amountIn: bigint) => {
			const price = BTC_PRICE / ETH_PRICE / ethPoolPriceMultiplier
			console.log(price)
			const rate = -Math.log(price)
			return {
				rate,
				amountOut: safeMultiply(amountIn, price),
			}
		},
	})
	graph.addEdge({
		from: WETH_FUSE,
		to: WBTC_FUSE,
		type: ActionType.SWAP,
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
		from: ETH_ARB,
		to: WETH_FUSE,
		type: ActionType.STARGATE_BRIDGE,
		getRate: stargateBridgeAction.getRate,
	})
	graph.addEdge({
		from: WETH_FUSE,
		to: ETH_ARB,
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
		from: WBTC_FUSE,
		to: WBTC_ARB,
		type: ActionType.FUSE_BRIDGE,
		getRate: fuseBridgeAction.getRate,
	})
	graph.addEdge({
		from: WBTC_ARB,
		to: WBTC_FUSE,
		type: ActionType.FUSE_BRIDGE,
		getRate: fuseBridgeAction.getRate,
	})

	return graph
}
