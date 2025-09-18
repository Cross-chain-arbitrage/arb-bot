import { arbitrum, fuse } from 'viem/chains'
import { Pool } from '../../../src/dex/base/Pool'
import {
	FuseBridgeEdge,
	StargateBridgeEdge,
	SwapEdge,
} from '../../../src/graphs/primitives/edges/edge'
import { Graph } from '../../../src/graphs/primitives/Graph'
import { Token } from '../../../src/primitives/tokens/Token'
import { TokenUtils } from '../../../src/primitives/tokens/TokenUtils'
import { safeMultiply } from '../../testUtils/math'

export async function getWethWbtcFuseGraphWithDeadEnd(
	ethPoolPriceMultiplier: number = 1,
): Promise<Graph> {
	const WBTC_ARB_ADDR = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
	const USDT_ARB_ADDR = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' // Dead end
	const WETH_FUSE_ADDR = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
	const WBTC_FUSE_ADDR = '0x33284f95ccb7B948d9D352e1439561CF83d8d00d'
	const WETH_ARB_ADDR = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'

	const graph = new Graph()

	const WETH_ARB = await TokenUtils.fromAddress<Token>(
		WETH_ARB_ADDR,
		arbitrum.id,
	)
	const FUSE_FUSE = TokenUtils.getNative(fuse.id)

	const WBTC_ARB = await TokenUtils.fromAddress<Token>(
		WBTC_ARB_ADDR,
		arbitrum.id,
	)
	const WETH_FUSE = await TokenUtils.fromAddress<Token>(
		WETH_FUSE_ADDR,
		fuse.id,
	)
	const WBTC_FUSE = await TokenUtils.fromAddress<Token>(
		WBTC_FUSE_ADDR,
		fuse.id,
	)

	const USDT_ARB = await TokenUtils.fromAddress<Token>(
		USDT_ARB_ADDR,
		arbitrum.id,
	)

	graph.addNode(WETH_ARB)
	graph.addNode(FUSE_FUSE)

	graph.addNode(WBTC_ARB)
	graph.addNode(WETH_FUSE)
	graph.addNode(WBTC_FUSE)

	// Trap node
	graph.addNode(USDT_ARB)

	const BTC_PRICE = 110_000
	const ETH_PRICE = 2_700

	// SWAP: ETH (ARB) <-> WBTC (ARB)
	const swapEthToBtcOnArbitrum = new SwapEdge(
		WETH_ARB,
		WBTC_ARB,
		{} as Pool,
		graph,
	)
	swapEthToBtcOnArbitrum.getRate = (amountIn: bigint) => {
		const price = ETH_PRICE / BTC_PRICE
		const rate = -Math.log(price)
		return Promise.resolve({
			rate,
			amountOut: safeMultiply(amountIn, price),
		})
	}
	graph.addEdge(swapEthToBtcOnArbitrum)

	const swapBtcToEthOnArbitrum = new SwapEdge(
		WBTC_ARB,
		WETH_ARB,
		{} as Pool,
		graph,
	)
	swapBtcToEthOnArbitrum.getRate = (amountIn: bigint) => {
		const price = BTC_PRICE / ETH_PRICE
		const rate = -Math.log(price)
		return Promise.resolve({
			rate,
			amountOut: safeMultiply(amountIn, price),
		})
	}
	graph.addEdge(swapBtcToEthOnArbitrum)

	// SWAP: WBTC (FUSE) -> WETH (FUSE)
	const swapBtcToEthOnFuse = new SwapEdge(
		WBTC_FUSE,
		WETH_FUSE,
		{} as Pool,
		graph,
	)
	swapBtcToEthOnFuse.getRate = (amountIn: bigint) => {
		const price = BTC_PRICE / ETH_PRICE / ethPoolPriceMultiplier
		const rate = -Math.log(price)
		return Promise.resolve({
			rate,
			amountOut: safeMultiply(amountIn, price),
		})
	}

	graph.addEdge(swapBtcToEthOnFuse)

	// SWAP: WETH (FUSE) -> WBTC (FUSE)
	const swapEthToBtcOnFuse = new SwapEdge(
		WETH_FUSE,
		WBTC_FUSE,
		{} as Pool,
		graph,
	)
	swapEthToBtcOnFuse.getRate = (amountIn: bigint) => {
		const price = (ETH_PRICE * ethPoolPriceMultiplier) / BTC_PRICE
		const rate = -Math.log(price)
		return Promise.resolve({
			rate,
			amountOut: safeMultiply(amountIn, price),
		})
	}
	graph.addEdge(swapEthToBtcOnFuse)

	// STARGATE BRIDGE: WETH (ARB) <-> WETH (FUSE)
	const stargateBridgeEthToWeth = new StargateBridgeEdge(
		WETH_ARB,
		WETH_FUSE,
		graph,
	)
	stargateBridgeEthToWeth.getRate = getOneToOneRate
	graph.addEdge(stargateBridgeEthToWeth)

	const stargateBridgeWethToEth = new StargateBridgeEdge(
		WETH_FUSE,
		WETH_ARB,
		graph,
	)
	stargateBridgeWethToEth.getRate = getOneToOneRate
	graph.addEdge(stargateBridgeWethToEth)

	// FUSE BRIDGE: WBTC (FUSE) <-> WBTC (ARB)
	const fuseBridgeWbtcOnFuseToWbtcOnArbitrum = new FuseBridgeEdge(
		WBTC_FUSE,
		WBTC_ARB,
		graph,
	)
	fuseBridgeWbtcOnFuseToWbtcOnArbitrum.getRate = getOneToOneRate
	graph.addEdge(fuseBridgeWbtcOnFuseToWbtcOnArbitrum)

	const fuseBridgeWbtcOnArbitrumToWbtcOnFuse = new FuseBridgeEdge(
		WBTC_ARB,
		WBTC_FUSE,
		graph,
	)
	fuseBridgeWbtcOnArbitrumToWbtcOnFuse.getRate = getOneToOneRate
	graph.addEdge(fuseBridgeWbtcOnArbitrumToWbtcOnFuse)

	const swapEthToUsdtOnArbitrum = new SwapEdge(
		WETH_ARB,
		USDT_ARB,
		{} as Pool,
		graph,
	)
	swapEthToUsdtOnArbitrum.getRate = (amountIn: bigint) => {
		const price = ETH_PRICE
		return Promise.resolve({
			rate: -Math.log(price),
			amountOut: safeMultiply(amountIn, price),
		})
	}
	graph.addEdge(swapEthToUsdtOnArbitrum)

	const swapUsdtToEthOnArbitrum = new SwapEdge(
		USDT_ARB,
		WETH_ARB,
		{} as Pool,
		graph,
	)
	swapUsdtToEthOnArbitrum.getRate = (amountIn: bigint) => {
		const price = 1 / ETH_PRICE
		return Promise.resolve({
			rate: -Math.log(price),
			amountOut: safeMultiply(amountIn, price),
		})
	}
	graph.addEdge(swapUsdtToEthOnArbitrum)

	return graph
}

function getOneToOneRate(amountIn: bigint) {
	return Promise.resolve({
		rate: 0,
		amountOut: amountIn,
	})
}
