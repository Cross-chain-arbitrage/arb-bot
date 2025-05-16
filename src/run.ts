import { arbitrum, fuse } from 'viem/chains'
import logger from './utils/logger'
import {
	AlgebraPoolArbitrageStrategy,
	ArbitrageConfig,
	ImmutablesConfig,
} from './AlgebraPoolArbitrageStrategy'
import { GeckoTerminalChainId } from './geckoterminal/chains'
import { AlgebraPool } from './dex/algebra/Pool'
import { TokenUtils } from './utils/tokens/TokenUtils'

/* ======== CONSTANTS ======== */

export const WBTC_ARB = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'

const STRATEGY_CONFIG: ArbitrageConfig = {
	MIN_SPREAD_PERCENT: 0.25,
	ARBITRAGE_AMOUNT_USD: 300,
	MIN_PROFIT_USD: 1,
	SLIPPAGE: 30,
} as const

const STRATEGY_IMMUTABLES: ImmutablesConfig = {
	baseChain: {
		id: arbitrum.id,
		name: arbitrum.name,
		geckoTerminalId: GeckoTerminalChainId.ARBITRUM,
	},
	poolAddress: '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992',
	poolChainId: fuse.id,
} as const

async function main() {
	// catch flag --simulate
	const simulate = process.argv.includes('--simulate')

	const pool = await AlgebraPool.create(
		STRATEGY_IMMUTABLES.poolAddress,
		STRATEGY_IMMUTABLES.poolChainId,
	)

	const token0Arb = TokenUtils.createNative(STRATEGY_IMMUTABLES.baseChain.id)

	const token1Arb = await TokenUtils.fromAddress(
		WBTC_ARB,
		STRATEGY_IMMUTABLES.baseChain.id,
	)

	const strategy = new AlgebraPoolArbitrageStrategy(
		STRATEGY_CONFIG,
		STRATEGY_IMMUTABLES,
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
