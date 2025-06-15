import { arbitrum, fuse } from 'viem/chains'
import { GeckoTerminalAPI } from './data-apis/geckoterminal/GeckoTerminalAPI'
import { PoolType, PoolUtils } from './dex/PoolUtils'
import { GraphArbitrageBot } from './graphs/GraphArbitrageBot'
import { GraphBuilder } from './graphs/GraphBuilder'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import logger from './utils/logger'

/* ============ Pools ============ */

const FUSE_POOL = '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992'
const FUSE_POOL_TYPE = PoolType.ALGEBRA
const ARB_POOL = '0x2f5e87C9312fa29aed5c179E456625D79015299c'
const ARB_POOL_TYPE = PoolType.UNIV3

/* ============ Economic Constants ============ */

const MIN_PROFIT_USD = 1

const OPTIMIZATION_CONFIG = {
	initialValueUSD: 50,
	stepUSD: 50,
	stepsAmount: 5,
}

/* ============ Strategy ============ */

async function main() {
	logger.info('Starting Graph Arbitrage Bot')

	const pools = await Promise.all([
		PoolUtils.createPool(FUSE_POOL, fuse.id, FUSE_POOL_TYPE),
		PoolUtils.createPool(ARB_POOL, arbitrum.id, ARB_POOL_TYPE),
	])

	const graph = await GraphBuilder.buildFromPools(pools)

	const ethPrice = await GeckoTerminalAPI.getTokenPriceETH()
	const ethNative = TokenUtils.getNative(arbitrum.id)

	logger.info('Starting searching for arbitrage')

	const bot = new GraphArbitrageBot(
		ethNative,
		graph,
		OPTIMIZATION_CONFIG,
		ethPrice,
		MIN_PROFIT_USD,
	)

	bot.start()
}

void main()
