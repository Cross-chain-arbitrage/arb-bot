import { arbitrum, fuse } from 'viem/chains'
import logger from './utils/logger'
import {
	AlgebraPoolArbitrageStrategy,
	BaseChain,
} from './AlgebraPoolArbitrageStrategy'
import { GeckoTerminalChainId } from './geckoterminal/chains'
import { AlgebraPool } from './dex/algebra/Pool'
import { TokenUtils } from './utils/tokens/TokenUtils'
import { EconomicsConfig } from './AlgebraPoolArbitrageStrategy'
/* ======== CONSTANTS ======== */

export const WBTC_ARB = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'

const STRATEGY_CONFIG: EconomicsConfig = {
	MIN_SPREAD_PERCENT: 0.25,
	ARBITRAGE_AMOUNT_USD: 300,
	MIN_PROFIT_USD: 1,
	SLIPPAGE: 30,
} as const

const poolAddress = '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992'
const poolChainId = fuse.id

const baseChain: BaseChain = {
	id: arbitrum.id,
	name: arbitrum.name,
	geckoTerminalId: GeckoTerminalChainId.ARBITRUM,
}

async function main() {
	// catch flag --simulate
	const simulate = process.argv.includes('--simulate')

	const pool = await AlgebraPool.create(poolAddress, poolChainId)

	const token0Arb = TokenUtils.createNative(baseChain.id)

	const token1Arb = await TokenUtils.fromAddress(WBTC_ARB, baseChain.id)

	const strategy = new AlgebraPoolArbitrageStrategy(
		STRATEGY_CONFIG,
		baseChain,
		pool,
		token0Arb,
		token1Arb,
	)

	await strategy.arbitrage(simulate)
}

// Only run if this file is executed directly
if (require.main === module) {
	main().catch((error) => {
		logger.error('Error executing arbitrage')
		console.error(error)
		process.exit(1)
	})
}
