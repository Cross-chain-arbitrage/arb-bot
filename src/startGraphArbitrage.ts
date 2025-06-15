import { arbitrum } from 'viem/chains'
import { GeckoTerminalAPI } from './data-apis/geckoterminal/GeckoTerminalAPI'
import { GraphArbitrageBot } from './graphs/GraphArbitrageBot'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { FuseWbtcGraphStrategy } from './strategies/FuseWbtcGraphStrategy'
import logger from './utils/logger'

async function main() {
	logger.info('Starting FuseWbtcGraphStrategy')

	const { graph } = await FuseWbtcGraphStrategy.setup()

	const ethPrice = await GeckoTerminalAPI.getTokenPriceETH()
	const ethNative = TokenUtils.getNative(arbitrum.id)

	logger.info('Starting searching for arbitrage')

	const minProfitUsd = 1
	const bot = new GraphArbitrageBot(
		ethNative,
		graph,
		{ initialValueUSD: 50, stepUSD: 50, stepsAmount: 5 },
		ethPrice,
		minProfitUsd,
	)

	bot.start()
}

void main()
