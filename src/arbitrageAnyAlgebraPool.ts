import { arbitrum, fuse } from 'viem/chains'
import { AlgebraPool } from './dex/algebra/Pool'
import { Token } from './utils/tokens/Token'
import { getAccountAddress } from './utils/getAccount'
import { GeckoTerminalAPI } from './geckoterminal/GeckoTerminalAPI'
import { Stargate } from './stargate/Stargate'
import logger from './utils/logger'
import { GeckoTerminalChainId } from './geckoterminal/chains'
import { TokenUtils } from './utils/tokens/TokenUtils'
import { NativeCurrency } from './utils/tokens/NativeCurrency'

/* ======== CONSTANTS ======== */

const STRATEGY_CONFIG = {
	MIN_SPREAD_PERCENT: 0.25,
	ARBITRAGE_AMOUNT_USD: 25,
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
	token0Arb: '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590',
	token1Arb: '0x34009565bfEeFded0F7e774629a745636Bf35E82',
} as const

/* ======== TYPES ======== */

interface ArbitrageOpportunity {
	tokenIn: Token
	tokenInArb: Token | NativeCurrency
	tokenOut: Token
	tokenOutArb: Token | NativeCurrency
	amountIn: bigint
	amountOut: bigint
	potentialProfit: number
	pool: AlgebraPool
}

interface ImmutablesConfig {
	baseChain: {
		id: number
		name: string
		geckoTerminalId: GeckoTerminalChainId
	}
	poolAddress: Address
	poolChainId: number
	token0Arb: Address
	token1Arb: Address
}

/* ======== CLASS ======== */

export class ArbitrageAnyAlgebraPool {
	private readonly config: typeof STRATEGY_CONFIG
	private readonly immutables: ImmutablesConfig
	private pool: AlgebraPool | null = null
	private token0: Token | null = null
	private token1: Token | null = null
	private token0Arb: Token | null = null
	private token1Arb: Token | null = null

	constructor(
		config: typeof STRATEGY_CONFIG = STRATEGY_CONFIG,
		immutables: ImmutablesConfig = STRATEGY_IMMUTABLES,
	) {
		this.config = config
		this.immutables = immutables
	}

	private async getTokens() {
		if (
			this.pool &&
			this.token0 &&
			this.token1 &&
			this.token0Arb &&
			this.token1Arb
		) {
			return {
				token0: this.token0,
				token1: this.token1,
				token0Arb: this.token0Arb,
				token1Arb: this.token1Arb,
			}
		}

		this.pool = await AlgebraPool.create(
			this.immutables.poolAddress,
			this.immutables.poolChainId,
		)

		this.token0 = this.pool.token0
		this.token1 = this.pool.token1

		this.token0Arb = await TokenUtils.fromAddress<Token>(
			this.immutables.token0Arb,
			this.immutables.baseChain.id,
		)
		this.token1Arb = await TokenUtils.fromAddress<Token>(
			this.immutables.token1Arb,
			this.immutables.baseChain.id,
		)

		return {
			token0: this.token0,
			token1: this.token1,
			token0Arb: this.token0Arb,
			token1Arb: this.token1Arb,
		}
	}

	private async getMarketPrices(
		token0Arb: Token | NativeCurrency,
		token1Arb: Token | NativeCurrency,
	) {
		const [price0, price1] = await Promise.all([
			GeckoTerminalAPI.getTokenPriceForChain(
				token0Arb.address,
				GeckoTerminalChainId.ARBITRUM,
			),
			GeckoTerminalAPI.getTokenPriceForChain(
				token1Arb.address,
				GeckoTerminalChainId.ARBITRUM,
			),
		])

		logger.info(`${token0Arb.symbol} price: $${price0}`)
		logger.info(`${token1Arb.symbol} price: $${price1}`)

		return { price0, price1 }
	}

	private async validateArbitrageOpportunity(
		initialOpportunity: ArbitrageOpportunity,
	) {
		const { price0, price1 } = await this.getMarketPrices(
			initialOpportunity.tokenIn,
			initialOpportunity.tokenOut,
		)

		const updatedOpportunity = await this.findArbitrageOpportunity(
			initialOpportunity.pool,
			price0,
			price1,
			initialOpportunity.tokenIn,
			initialOpportunity.tokenOut,
		)

		if (
			!updatedOpportunity ||
			updatedOpportunity.tokenIn.address !==
				initialOpportunity.tokenIn.address
		) {
			return false
		}

		return true
	}

	private async findArbitrageOpportunity(
		pool: AlgebraPool,
		price0: number,
		price1: number,
		token0: Token,
		token1: Token,
	): Promise<ArbitrageOpportunity | null> {
		const { price } = await pool.getPrices()
		const priceRatio = price0 / price1
		const difference = this.calculatePriceDiff(price, priceRatio)

		logger.info(`Difference: ${difference.toFixed(2)}%`)

		if (Math.abs(difference) < this.config.MIN_SPREAD_PERCENT) {
			logger.info('No arbitrage opportunity found, skipping')
			return null
		}

		const tokenIn = price > priceRatio ? token0 : token1
		logger.info(`Token in: ${tokenIn.symbol}`)
		const tokenOut = tokenIn === token0 ? token1 : token0
		logger.info(`Token out: ${tokenOut.symbol}`)

		const tokenInPrice = tokenIn === token0 ? price0 : price1
		const tokenOutPrice = tokenOut === token0 ? price0 : price1
		const arbitrageAmount = this.config.ARBITRAGE_AMOUNT_USD / tokenInPrice

		const amountIn = tokenIn.parseUnits(arbitrageAmount.toString())
		const { amountOut } = await pool.quoteSwap({
			tokenIn,
			tokenOut,
			amountIn,
		})

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

		if (potentialProfit < this.config.MIN_PROFIT_USD) {
			logger.info(
				`Not enough profit ($${potentialProfit.toFixed(2)}), skipping`,
			)
			return null
		}

		const tokenInArbAddress =
			price > priceRatio
				? this.immutables.token0Arb
				: this.immutables.token1Arb
		const tokenOutArbAddress =
			price > priceRatio
				? this.immutables.token1Arb
				: this.immutables.token0Arb

		const tokenInArb = await TokenUtils.fromAddress(
			tokenInArbAddress,
			this.immutables.baseChain.id,
		)
		const tokenOutArb = await TokenUtils.fromAddress(
			tokenOutArbAddress,
			this.immutables.baseChain.id,
		)

		return {
			tokenIn,
			tokenOut,
			amountIn,
			amountOut,
			potentialProfit,
			pool,
			tokenInArb,
			tokenOutArb,
		}
	}

	private async executeArbitrage(opportunity: ArbitrageOpportunity) {
		const account = getAccountAddress()
		const { tokenIn, tokenOut, amountIn, amountOut, pool } = opportunity

		// 1. Bridge token from Arbitrum to target chain
		const bridgeTx = await Stargate.send(
			tokenIn,
			amountIn,
			account,
			pool.chainId,
		)
		logger.info(
			`Bridged ${tokenIn.symbol} from Arbitrum to target chain: ${bridgeTx.hash}`,
		)
		await bridgeTx.waitForBridgeToFinish()
		logger.info(
			`Bridge ${tokenIn.symbol} to target chain: ${bridgeTx.hash} finished`,
		)

		// 1.5. Check that arbitrage opportunity is still valid
		const isValid = await this.validateArbitrageOpportunity(opportunity)

		if (!isValid) {
			logger.info('Arbitrage opportunity is no longer valid, skipping')
			return
		}

		// 2. Swap on target chain
		const swapTx = await pool.swap({
			tokenIn,
			tokenOut,
			amountIn,
			slippage: this.config.SLIPPAGE,
		})
		logger.info(
			`Swapped ${tokenIn.symbol} for ${tokenOut.symbol}: ${swapTx.receipt.transactionHash}`,
		)

		// 3. Bridge back to Arbitrum
		const bridgeBackTx = await Stargate.send(
			tokenOut,
			amountOut,
			account,
			arbitrum.id,
		)

		logger.info(
			`Bridged ${tokenOut.symbol} back to Arbitrum: ${bridgeBackTx.hash}`,
		)
		await bridgeBackTx.waitForBridgeToFinish()
		logger.info(
			`Bridge ${tokenOut.symbol} to Arbitrum: ${bridgeBackTx.hash} finished`,
		)

		const tokenOutArb = opportunity.tokenOutArb

		const tokenOutArbBalance = await tokenOutArb.balanceOf(account)

		const tokenOutArbPrice = await GeckoTerminalAPI.getTokenPriceForChain(
			tokenOutArb.address,
			this.immutables.baseChain.geckoTerminalId,
		)

		const tokenOutBalanceUSD =
			Number(tokenOutArb.formatUnits(tokenOutArbBalance)) *
			tokenOutArbPrice

		logger.info(
			`${tokenOutArb.symbol} balance: ${tokenOutArb.formatUnits(tokenOutArbBalance)} (${tokenOutBalanceUSD.toFixed(2)} USD)`,
		)
	}

	public calculatePriceDiff(
		actualPrice: number,
		expectedPrice: number,
	): number {
		return (actualPrice / expectedPrice) * 100 - 100
	}

	public async arbitrage(simulate: boolean) {
		try {
			// Initialize
			const { token0, token1 } = await this.getTokens()
			const { price0, price1 } = await this.getMarketPrices(
				token0,
				token1,
			)
			const pool = await AlgebraPool.create(
				this.immutables.poolAddress,
				this.immutables.poolChainId,
			)

			// Find opportunity
			const opportunity = await this.findArbitrageOpportunity(
				pool,
				price0,
				price1,
				token0,
				token1,
			)

			if (!opportunity) return

			if (simulate) {
				logger.info('Stopping simulation...')
				return
			}

			// Execute
			logger.info('Executing arbitrage...')
			await this.executeArbitrage(opportunity)
			logger.info('Arbitrage completed successfully!')
		} catch (error) {
			logger.error('Error executing arbitrage:', error)
			throw error
		}
	}
}

// Only run if this file is executed directly
if (require.main === module) {
	const simulate = process.argv.includes('--simulate')
	const arbitrage = new ArbitrageAnyAlgebraPool()

	arbitrage.arbitrage(simulate).catch((error) => {
		logger.error('Error executing arbitrage')
		console.error(error)
		process.exit(1)
	})
}
