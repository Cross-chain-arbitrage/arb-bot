import { arbitrum } from 'viem/chains'
import { GraphArbitrageBot } from './graphs/GraphArbitrageBot'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { FuseWbtcGraphStrategy } from './strategies/FuseWbtcGraphStrategy'
import logger from './utils/logger'

async function main() {
	logger.info('Starting FuseWbtcGraphStrategy')

	const strategy = await FuseWbtcGraphStrategy.setup()

	const ethPrice = 2550
	const ethNative = TokenUtils.getNative(arbitrum.id)

	logger.info('Starting searching for arbitrage')

	const minProfitUsd = 1
	const bot = new GraphArbitrageBot(
		ethNative,
		strategy.graph,
		{ initialValueUSD: 50, stepUSD: 50, stepsAmount: 5 },
		ethPrice,
		minProfitUsd,
	)

	bot.start()
}

void main()
