import { arbitrum } from 'viem/chains'
import { GeckoTerminalAPI } from '../../data-apis/geckoterminal/GeckoTerminalAPI'
import { PoolUtils } from '../../dex/PoolUtils'
import { GraphArbitrageBot } from '../../graphs/GraphArbitrageBot'
import { GraphBuilder } from '../../graphs/GraphBuilder'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../utils/ClientManager'
import logger from '../../utils/logger'
import { WETH_POOLS } from './wethPools'

/* ============ Economic Constants ============ */

const MIN_PROFIT_USD = 1

const OPTIMIZATION_CONFIG = {
	initialValueUSD: 50,
	stepUSD: 50,
	stepsAmount: 5,
}

const SLIPPAGE = 30

/* ============ Strategy ============ */

async function main() {
	ClientManager.useCustomRpcUrl(arbitrum.id)
	logger.info('Starting Graph Arbitrage Bot')

	const poolPromises = Object.values(WETH_POOLS).map((pool) =>
		PoolUtils.createPool(pool.address, pool.chainId, pool.type),
	)

	const pools = await Promise.all(poolPromises)

	const graph = await GraphBuilder.build({
		pools,
		stargateConfig: {
			connectHydraChains: false,
			baseChainId: arbitrum.id,
		},
		slippage: SLIPPAGE,
	})

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
