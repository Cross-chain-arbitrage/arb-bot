import { arbitrum, fuse } from 'viem/chains'
import { GeckoTerminalChainId } from './data-apis/geckoterminal/chains'
import { AlgebraPool } from './dex/algebra/Pool'
import { UniV3Pool } from './dex/uniswapV3/Pool'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import {
	AlgebraPoolArbitrageStrategy,
	BaseChain,
	EconomicsConfig,
} from './strategies/AlgebraPoolArbitrageStrategy'
import { wait } from './utils/common'
import logger from './utils/logger'

/* ======== CONSTANTS ======== */

export const WBTC_ARB = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'

const ARBITRAGE_POLLING_INTERVAL = 20 * 60_000 // 15 minutes

const STRATEGY_CONFIG: EconomicsConfig = {
	MIN_SPREAD_PERCENT: 0.25,
	ARBITRAGE_AMOUNT_USD: 340,
	MIN_PROFIT_USD: 2,
	SLIPPAGE: 30,
} as const

const fusePoolAddress = '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992'
const basePoolAddress = '0x2f5e87C9312fa29aed5c179E456625D79015299c'
const poolChainId = fuse.id

const baseChain: BaseChain = {
	id: arbitrum.id,
	name: arbitrum.name,
	geckoTerminalId: GeckoTerminalChainId.ARBITRUM,
}

async function main() {
	// catch flag --simulate
	const simulate = process.argv.includes('--simulate')

	const fusePool = await AlgebraPool.create(fusePoolAddress, poolChainId)
	const arbPool = await UniV3Pool.create(basePoolAddress, baseChain.id)

	const baseToken = await TokenUtils.getNative(baseChain.id)

	const token0Arb = await TokenUtils.getNative(baseChain.id)
	const token1Arb = await TokenUtils.fromAddress(WBTC_ARB, baseChain.id)

	const strategy = new AlgebraPoolArbitrageStrategy(
		STRATEGY_CONFIG,
		baseChain,
		arbPool,
		fusePool,
		baseToken,
		token0Arb,
		token1Arb,
	)

	while (true) {
		await strategy.arbitrage(simulate)
		await wait(ARBITRAGE_POLLING_INTERVAL)
	}
}

// Only run if this file is executed directly
if (require.main === module) {
	main().catch((error) => {
		logger.error('Error executing arbitrage')
		console.error(error)
		process.exit(1)
	})
}
