import { arbitrum } from 'viem/chains'
import { GraphArbitrageBot } from './graphs/GraphArbitrageBot'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { FuseWbtcGraphStrategy } from './strategies/FuseWbtcGraphStrategy'
import logger from './utils/logger'

async function main() {
	logger.info('Starting FuseWbtcGraphStrategy')

	const { graph } = await FuseWbtcGraphStrategy.setup()

	const ethPrice = 2700
	const ethNative = TokenUtils.getNative(arbitrum.id)

	logger.info('Starting approve all')

	const bot = new GraphArbitrageBot(
		ethNative,
		graph,
		{ initialValueUSD: 10, stepUSD: 20, stepsAmount: 5 },
		ethPrice,
	)

	await bot.approveAll()
}

void main()
