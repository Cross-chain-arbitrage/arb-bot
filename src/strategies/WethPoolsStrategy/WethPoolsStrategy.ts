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
const GIVE_APPROVES = false // Mark 'false' to skip approval step

const OPTIMIZATION_CONFIG: GraphOptimizerOptions = {
	initialValueUSD: 100,
	stepUSD: 100,
	stepsAmount: 5,
	maxPathLength: 6,
}

const SLIPPAGE = 30

/* ============ Strategy ============ */

class WethPoolsStrategy {
	static async buildGraph() {
		const poolPromises = Object.values(WETH_POOLS).map((pool) =>
			PoolUtils.createPool(pool.address, pool.chainId, pool.type),
		)

		const pools = await Promise.all(poolPromises)

		return await GraphBuilder.build({
			pools,
			stargateConfig: {
				connectSecondaryChains: false,
				baseChainId: arbitrum.id,
			},
			slippage: SLIPPAGE,
		})
	}

	static async run(giveApprovals: boolean = false) {
		ClientManager.useCustomRpcUrl(arbitrum.id)

		if (giveApprovals) {
			await this.prepare()
		}

		const graph = await this.buildGraph()

		logger.info('Starting Graph Arbitrage Bot')
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

	static async prepare() {
		logger.info('Starting WethPoolsStrategy')

		const ethPrice = await GeckoTerminalAPI.getTokenPriceETH()
		const ethNative = TokenUtils.getNative(arbitrum.id)

		logger.info('Starting approve all')

		const bot = new GraphArbitrageBot(
			ethNative,
			await this.buildGraph(),
			OPTIMIZATION_CONFIG,
			ethPrice,
		)

		await bot.approveAll()
	}
}

async function main() {
	await WethPoolsStrategy.run(GIVE_APPROVES)
}

if (require.main === module) {
	void main()
}
