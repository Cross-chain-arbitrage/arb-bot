import { arbitrum } from 'viem/chains'
import { GeckoTerminalAPI } from './data-apis/geckoterminal/GeckoTerminalAPI'
import { GraphArbitrageBot } from './graphs/GraphArbitrageBot'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { GigaBigaStrategySetup } from './strategies/GigaBigaGraphStrategy'
import { ClientManager } from './utils/ClientManager'
import logger from './utils/logger'

/* ============ Economic Constants ============ */

const MIN_PROFIT_USD = 1

const OPTIMIZATION_CONFIG = {
	initialValueUSD: 100,
	stepUSD: 100,
	stepsAmount: 5,
}
const POLLING_INTERVAL = 10_000

/* ============ Strategy ============ */

async function main() {
	ClientManager.useCustomRpcUrl(arbitrum.id)
	logger.info('Starting Graph Arbitrage Bot')

	const graph = await GigaBigaStrategySetup.setup()

	const ethPrice = await GeckoTerminalAPI.getTokenPriceETH()
	const ethNative = TokenUtils.getNative(arbitrum.id)

	logger.info('Starting searching for arbitrage')

	const bot = new GraphArbitrageBot(
		ethNative,
		graph,
		OPTIMIZATION_CONFIG,
		ethPrice,
		MIN_PROFIT_USD,
		POLLING_INTERVAL,
	)

	bot.start()
}

void main()
