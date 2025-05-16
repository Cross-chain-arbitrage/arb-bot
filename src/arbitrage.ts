import { arbitrum, fuse } from 'viem/chains'
import { AlgebraPool } from './dex/algebra/Pool'
import { TokenUtils } from './utils/tokens/TokenUtils'
import { Token } from './utils/tokens/Token'
import { getAccountAddress } from './utils/getAccount'
import { GeckoTerminalAPI } from './geckoterminal/GeckoTerminalAPI'
import { Stargate } from './stargate/Stargate'
import { FuseBridge } from './fuse/bridge/FuseBridge'
import logger from './utils/logger'

const WETH_WBTC_POOL_FUSE = '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992'
const WETH_FUSE = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
const WBTC_FUSE = '0x34009565bfEeFded0F7e774629a745636Bf35E82'
const WBTC_ARB = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'

const ARBITRAGE_AMOUNT_ETH = '0.03' // 0.01 ETH for arbitrage
const MIN_PROFIT_USD = 1 // Minimum profit in USD to execute arbitrage

export async function arbitrage() {
	const account = getAccountAddress()

	// Initialize tokens
	const wethFuse = await TokenUtils.fromAddress<Token>(WETH_FUSE, fuse.id)
	const wbtcFuse = await TokenUtils.fromAddress<Token>(WBTC_FUSE, fuse.id)
	const wbtcArb = await TokenUtils.fromAddress<Token>(WBTC_ARB, arbitrum.id)

	// Initialize pool
	const pool = await AlgebraPool.create(WETH_WBTC_POOL_FUSE, fuse.id)

	// Get market prices
	const priceETH = await GeckoTerminalAPI.getTokenPriceETH()
	const priceBTC = await GeckoTerminalAPI.getTokenPriceBTC()

	logger.info(`ETH price: $${priceETH}`)
	logger.info(`BTC price: $${priceBTC}`)

	// Calculate arbitrage amount in wei
	const arbitrageAmount = wethFuse.parseUnits(ARBITRAGE_AMOUNT_ETH)

	// Simulate swap on Fuse
	const amountsOut = await pool.getAmountsOut(arbitrageAmount, [
		wethFuse.address,
		wbtcFuse.address,
	])

	console.log(amountsOut)
	const wbtcAmount = amountsOut[1]

	// Calculate potential profit
	const amountInUSD = Number(wethFuse.formatUnits(arbitrageAmount)) * priceETH
	const amountOutUSD = Number(wbtcFuse.formatUnits(wbtcAmount)) * priceBTC
	const potentialProfit = amountOutUSD - amountInUSD

	logger.info(
		`AmountIn: ${wethFuse.formatUnits(arbitrageAmount)} ($${amountInUSD} USD)`,
	)
	logger.info(
		`Amount out: ${wbtcFuse.formatUnits(wbtcAmount)} ($${amountOutUSD} USD)`,
	)
	logger.info(`Potential profit: $${potentialProfit} USD`)

	if (potentialProfit < MIN_PROFIT_USD) {
		logger.info(`Not enough profit ($${potentialProfit}), skipping`)
		return
	}

	return

	// Execute arbitrage
	logger.info('Executing arbitrage...')

	// 1. Bridge ETH from Arbitrum to Fuse
	const nativeArb = TokenUtils.createNative(arbitrum.id)
	const bridgeTx = await Stargate.send(
		nativeArb,
		arbitrageAmount,
		account,
		fuse.id,
	)

	logger.info(`Bridged ETH from Arbitrum to Fuse: ${bridgeTx.hash}`)
	await bridgeTx.waitForBridgeToFinish()

	// 2. Swap ETH for WBTC on Fuse
	const swapTx = await pool.swap({
		tokenIn: wethFuse,
		tokenOut: wbtcFuse,
		amountIn: arbitrageAmount,
		slippage: 50,
	})

	logger.info(
		`Swapped ETH for WBTC on Fuse: ${swapTx.receipt.transactionHash}`,
	)

	// 3. Bridge WBTC back to Arbitrum
	const bridgeBackTx = await FuseBridge.bridge(
		wbtcFuse,
		arbitrum.id,
		account,
		wbtcAmount,
	)

	logger.info(`Bridged WBTC back to Arbitrum: ${bridgeBackTx.hash}`)
	await bridgeBackTx.waitForBridgeToFinish()
	logger.info(`BTC balance: ${await wbtcArb.balanceOf(account)}`)

	logger.info('Arbitrage completed successfully!')
}

// Only run if this file is executed directly
if (require.main === module) {
	arbitrage().catch((error) => {
		logger.error('Error executing arbitrage')
		console.error(error)
		process.exit(1)
	})
}
