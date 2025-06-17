import { arbitrum } from 'viem/chains'
import { GraphArbitrageBot } from './graphs/GraphArbitrageBot'
import { PriceOracle } from './modules/PriceOracle/PriceOracle'
import { TgArbitrageNotifier } from './modules/notification/TgArbitrageNotifier'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { FuseWbtcGraphStrategy } from './strategies/FuseWbtcGraphStrategy'
import logger from './utils/logger'

async function main() {
	logger.info('Starting FuseWbtcGraphStrategy')

	const { graph } = await FuseWbtcGraphStrategy.setup()

	const ethNative = TokenUtils.getNative(arbitrum.id)

	const priceOracle = await PriceOracle.create()

	logger.info('Starting approve all')

	const bot = new GraphArbitrageBot({
		graph,
		priceOracle: priceOracle,
		TgArbitrageNotifier: new TgArbitrageNotifier(),
		startToken: ethNative,
	})

	await bot.approveAll()
}

void main()
