import { arbitrum, fuse } from 'viem/chains'
import { AlgebraPool } from './dex/algebra/Pool'
import { TokenUtils } from './utils/tokens/TokenUtils'
import { Token } from './utils/tokens/Token'
import { getAccountAddress } from './utils/getAccount'
import { GeckoTerminalAPI } from './geckoterminal/GeckoTerminalAPI'
import { Stargate } from './stargate/Stargate'
import { FuseBridge } from './fuse/bridge/FuseBridge'
import logger from './utils/logger'
import { StargateBridgeTx } from './stargate/StargateBridgeTx'
import { FuseBridgeTx } from './fuse/bridge/FuseBridgeTx'
import { PoolUtils } from './dex/PoolUtils'
import { PoolType } from './dex/PoolUtils'

/* ======== CONSTANTS ======== */

const POOL_WETH_WBTC_FUSE = '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992'

const WETH_FUSE = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
const WBTC_FUSE = '0x34009565bfEeFded0F7e774629a745636Bf35E82'
const WBTC_ARB = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'

const CONFIG = {
	MIN_SPREAD_PERCENT: 0.25,
	ARBITRAGE_AMOUNT_USD: 25,
	MIN_PROFIT_USD: 1,
	SLIPPAGE: 30,
} as const

/* ======== TYPES ======== */

interface ArbitrageOpportunity {
	tokenIn: Token
	tokenOut: Token
	amountIn: bigint
	amountOut: bigint
	potentialProfit: number
}

/* ======== FUNCTIONS ======== */

async function getTokens() {
	const ethArb = TokenUtils.createNative(arbitrum.id)
	const wbtcArb = await TokenUtils.fromAddress<Token>(WBTC_ARB, arbitrum.id)
	const wethFuse = await TokenUtils.fromAddress<Token>(WETH_FUSE, fuse.id)
	const wbtcFuse = await TokenUtils.fromAddress<Token>(WBTC_FUSE, fuse.id)

	return { ethArb, wbtcArb, wethFuse, wbtcFuse }
}

async function getMarketPrices() {
	const [priceETH, priceBTC] = await Promise.all([
		GeckoTerminalAPI.getTokenPriceETH(),
		GeckoTerminalAPI.getTokenPriceBTC(),
	])

	logger.info(`ETH price: $${priceETH}`)
	logger.info(`BTC price: $${priceBTC}`)

	return { priceETH, priceBTC }
}

async function validateArbitrageOpportunity(
	initialOpportunity: ArbitrageOpportunity,
) {
	const pool = await AlgebraPool.create(POOL_WETH_WBTC_FUSE, fuse.id)
	const { priceETH, priceBTC } = await getMarketPrices()
	const { wethFuse, wbtcFuse } = await getTokens()

	const updatedOpportunity = await findArbitrageOpportunity(
		pool,
		priceETH,
		priceBTC,
		wethFuse,
		wbtcFuse,
	)

	if (
		!updatedOpportunity ||
		updatedOpportunity.tokenIn.address !==
			initialOpportunity.tokenIn.address
	) {
		logger.info('Arbitrage opportunity is no longer valid, skipping')
		return
	}
}

async function findArbitrageOpportunity(
	pool: AlgebraPool,
	priceETH: number,
	priceBTC: number,
	wethFuse: Token,
	wbtcFuse: Token,
): Promise<ArbitrageOpportunity | null> {
	const { price } = await pool.getPrices()
	const priceRatio = priceETH / priceBTC
	const difference = calculatePriceDiff(price, priceRatio)

	logger.info(`Difference: ${difference.toFixed(2)}%`)

	if (Math.abs(difference) < CONFIG.MIN_SPREAD_PERCENT) {
		logger.info('No arbitrage opportunity found, skipping')
		return null
	}

	const tokenIn = price > priceRatio ? wethFuse : wbtcFuse
	logger.info(`Token in: ${tokenIn.symbol}`)
	const tokenOut = tokenIn === wethFuse ? wbtcFuse : wethFuse
	logger.info(`Token out: ${tokenOut.symbol}`)

	const tokenInPrice = tokenIn.symbol === 'WETH' ? priceETH : priceBTC
	const tokenOutPrice = tokenOut.symbol === 'WETH' ? priceETH : priceBTC
	const arbitrageAmount = CONFIG.ARBITRAGE_AMOUNT_USD / tokenInPrice

	const amountIn = tokenIn.parseUnits(arbitrageAmount.toString())
	const { amountOut } = await pool.quoteSwap({ tokenIn, tokenOut, amountIn })

	const amountInUSD = (
		Number(tokenIn.formatUnits(amountIn)) * tokenInPrice
	).toFixed(2)
	const amountOutUSD = (
		Number(tokenOut.formatUnits(amountOut)) * tokenOutPrice
	).toFixed(2)
	const potentialProfit = Number(amountOutUSD) - Number(amountInUSD)

	logger.info(
		`AmountIn: ${tokenIn.formatUnits(amountIn)}, ${tokenIn.symbol} ($${amountInUSD} USD)`,
	)
	logger.info(
		`Amount out: ${tokenOut.formatUnits(amountOut)}, ${tokenOut.symbol} ($${amountOutUSD} USD)`,
	)
	logger.warn(`Potential profit: $${potentialProfit.toFixed(2)} USD`)

	if (potentialProfit < CONFIG.MIN_PROFIT_USD) {
		logger.info(
			`Not enough profit ($${potentialProfit.toFixed(2)}), skipping`,
		)
		return null
	}

	return { tokenIn, tokenOut, amountIn, amountOut, potentialProfit }
}

async function executeArbitrage(opportunity: ArbitrageOpportunity) {
	const account = getAccountAddress()
	const { tokenIn, tokenOut, amountIn, amountOut } = opportunity

	const { ethArb, wbtcArb } = await getTokens()

	let bridgeTx: StargateBridgeTx | FuseBridgeTx

	// 1. Bridge token from Arbitrum to Fuse
	if (tokenIn.symbol === 'WETH') {
		// Bridge ETH via Stargate
		bridgeTx = await Stargate.send(ethArb, amountIn, account, fuse.id)
	} else {
		// Bridge WBTC via FuseBridge
		bridgeTx = await FuseBridge.bridge(wbtcArb, fuse.id, account, amountIn)
	}
	logger.info(
		`Bridged ${tokenIn.symbol} from Arbitrum to Fuse: ${bridgeTx.hash}`,
	)
	await bridgeTx.waitForBridgeToFinish()
	logger.info(`Bridge ${tokenIn.symbol} to Fuse: ${bridgeTx.hash} finished`)

	// 1.5. Check that arbitrage opportunity is still valid
	await validateArbitrageOpportunity(opportunity)

	// 2. Swap on Fuse
	const pool = await PoolUtils.createPool(
		POOL_WETH_WBTC_FUSE,
		fuse.id,
		PoolType.ALGEBRA,
	)

	const swapTx = await pool.swap({
		tokenIn,
		tokenOut,
		amountIn,
		slippage: CONFIG.SLIPPAGE,
	})
	logger.info(
		`Swapped ${tokenIn.symbol} for ${tokenOut.symbol} on Fuse: ${swapTx.receipt.transactionHash}`,
	)

	// 3. Bridge back to Arbitrum
	let bridgeBackTx: StargateBridgeTx | FuseBridgeTx
	if (tokenOut.symbol === 'WETH') {
		// Bridge ETH via Stargate
		bridgeBackTx = await Stargate.send(
			tokenOut,
			amountOut,
			account,
			arbitrum.id,
		)
	} else {
		// Bridge WBTC via FuseBridge
		bridgeBackTx = await FuseBridge.bridge(
			tokenOut,
			arbitrum.id,
			account,
			amountOut,
		)
	}
	logger.info(
		`Bridged ${tokenOut.symbol} back to Arbitrum: ${bridgeBackTx.hash}`,
	)
	await bridgeBackTx.waitForBridgeToFinish()
	logger.info(
		`Bridge ${tokenOut.symbol} to Arbitrum: ${bridgeBackTx.hash} finished`,
	)

	const tokenOutBalance = await tokenOut.balanceOf(account)

	const { priceETH, priceBTC } = await getMarketPrices()
	const tokenOutPrice = tokenOut.symbol === 'WETH' ? priceETH : priceBTC
	const tokenOutBalanceUSD =
		Number(tokenOut.formatUnits(tokenOutBalance)) * tokenOutPrice

	logger.info(
		`${tokenOut.symbol} balance: ${tokenOut.formatUnits(tokenOutBalance)} (${tokenOutBalanceUSD.toFixed(2)} USD)`,
	)
}

export async function arbitrage(simulate: boolean) {
	try {
		// Initialize
		const { wethFuse, wbtcFuse } = await getTokens()
		const { priceETH, priceBTC } = await getMarketPrices()
		const pool = await AlgebraPool.create(POOL_WETH_WBTC_FUSE, fuse.id)

		// Find opportunity
		const opportunity = await findArbitrageOpportunity(
			pool,
			priceETH,
			priceBTC,
			wethFuse,
			wbtcFuse,
		)

		if (!opportunity) return

		if (simulate) {
			logger.info('Stopping simulation...')
			return
		}

		// Execute
		logger.info('Executing arbitrage...')

		await executeArbitrage(opportunity)

		logger.info('Arbitrage completed successfully!')
	} catch (error) {
		logger.error('Error executing arbitrage:', error)
		throw error
	}
}

export function calculatePriceDiff(
	actualPrice: number,
	expectedPrice: number,
): number {
	return (actualPrice / expectedPrice) * 100 - 100
}

// Only run if this file is executed directly
if (require.main === module) {
	// catch flag --simulate
	const simulate = process.argv.includes('--simulate')

	arbitrage(simulate).catch((error) => {
		logger.error('Error executing arbitrage')
		console.error(error)
		process.exit(1)
	})
}
