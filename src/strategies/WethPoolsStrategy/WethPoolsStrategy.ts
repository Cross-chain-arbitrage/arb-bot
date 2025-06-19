import { arbitrum } from 'viem/chains'
import { PoolUtils } from '../../dex/PoolUtils'
import { GraphArbitrageBot } from '../../graphs/GraphArbitrageBot'
import { GraphBuilder } from '../../graphs/GraphBuilder'
import { TgArbitrageNotifier } from '../../modules/notification/TgArbitrageNotifier'
import { PriceOracle } from '../../modules/PriceOracle/PriceOracle'
import { TokenUtils } from '../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../utils/ClientManager'
import logger from '../../utils/logger'
import { WETH_POOLS } from './wethPools'

/* ============ Economic Constants ============ */

const MIN_PROFIT_USD = 1
const GIVE_APPROVES = false // Mark 'false' to skip approval step

const OPTIMIZATION_CONFIG: GraphOptimizerOptions = {
	initialValueUSD: 100,
	stepUSD: 50,
	stepsAmount: 5,
	maxPathLength: 6,
}

const SLIPPAGE = 30
const POLLING_INTERVAL = 10_000
const ARBITRAGE_TIMEOUT = 5 * 60 * 1000

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

		logger.info('Starting Graph Arbitrage Bot')

		const bot = await this.buildBot()

		logger.info('Starting searching for arbitrage')

		bot.start()
	}

	static async buildBot(): Promise<GraphArbitrageBot> {
		const priceOracle = await PriceOracle.create()
		const ethNative = TokenUtils.getNative(arbitrum.id)

		return new GraphArbitrageBot({
			graph: await this.buildGraph(),
			priceOracle,
			TgArbitrageNotifier: new TgArbitrageNotifier(),
			startToken: ethNative,
			options: {
				graphOptimizerOptions: OPTIMIZATION_CONFIG,
				minProfitUsd: MIN_PROFIT_USD,
				pollingInterval: POLLING_INTERVAL,
				arbitrageTimeout: ARBITRAGE_TIMEOUT,
			},
		})
	}

	static async prepare() {
		logger.info('Starting WethPoolsStrategy')

		const bot = await this.buildBot()

		await bot.approveAll()
	}
}

async function main() {
	await WethPoolsStrategy.run(GIVE_APPROVES)
}

if (require.main === module) {
	void main()
}
