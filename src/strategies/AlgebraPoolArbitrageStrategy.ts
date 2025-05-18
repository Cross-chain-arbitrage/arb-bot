import { AlgebraPool } from '../dex/algebra/Pool'
import { Token } from '../utils/tokens/Token'
import { getAccountAddress } from '../utils/getAccount'
import { GeckoTerminalAPI } from '../geckoterminal/GeckoTerminalAPI'
import { Stargate } from '../stargate/Stargate'
import logger from '../utils/logger'
import { GeckoTerminalChainId } from '../geckoterminal/chains'
import { TokenUtils } from '../utils/tokens/TokenUtils'
import { NativeCurrency } from '../utils/tokens/NativeCurrency'
import { FuseBridge } from '../fuse/bridge/FuseBridge'
import { FuseBridgeTx } from '../fuse/bridge/FuseBridgeTx'
import { StargateBridgeTx } from '../stargate/StargateBridgeTx'
import { fuse } from 'viem/chains'
import { WBTC_ARB } from '../arbitrage'
import { BatchQuoteOptimizer } from '../optimizers/BatchQuoteOptimizer'
import { UniV3Pool } from '../dex/uniswapV3/Pool'
// import { WETH } from '../utils/tokens/WETH'
import { zeroAddress } from 'viem'

/* ======== TYPES ======== */

const WETH_ARB = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'

export interface EconomicsConfig {
	MIN_SPREAD_PERCENT: number
	ARBITRAGE_AMOUNT_USD: number
	MIN_PROFIT_USD: number
	SLIPPAGE: number
}

interface ArbitrageOpportunity {
	tokenIn: Token
	tokenInArb: Token | NativeCurrency
	tokenOut: Token
	tokenOutArb: Token | NativeCurrency
	amountIn: bigint
	amountOut: bigint
	potentialProfit: number
}

export interface BaseChain {
	id: number
	name: string
	geckoTerminalId: GeckoTerminalChainId
}

export class StrategyConfigurationError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, StrategyConfigurationError.prototype)
		this.name = 'StrategyConfigurationError'
	}
}

/* ======== CLASS ======== */

export class AlgebraPoolArbitrageStrategy {
	private token0: Token
	private token1: Token

	constructor(
		private readonly config: EconomicsConfig,
		private readonly baseChain: BaseChain,
		private readonly baseChainPool: UniV3Pool,
		private readonly pool: AlgebraPool,
		private readonly baseToken: Token | NativeCurrency,
		private readonly token0Arb: Token | NativeCurrency,
		private readonly token1Arb: Token | NativeCurrency,
	) {
		this.token0 = pool.token0
		this.token1 = pool.token1

		// Call initialization note
		this.onInitialized()

		if (baseChainPool.chainId !== baseChain.id) {
			throw new StrategyConfigurationError(
				`Base chain pool chainId (${baseChainPool.chainId}) does not match base chain id (${baseChain.id})`,
			)
		}

		if (baseToken.chainId !== baseChain.id) {
			throw new StrategyConfigurationError(
				`Base token chainId (${baseToken.chainId}) does not match base chain id (${baseChain.id})`,
			)
		}

		if (
			baseToken.address !== zeroAddress &&
			baseToken.address !== token0Arb.address &&
			baseToken.address !== token1Arb.address
		) {
			throw new StrategyConfigurationError(
				`Base token (${baseToken.symbol}) is not the same as token0Arb (${token0Arb.symbol}) or token1Arb (${token1Arb.symbol})`,
			)
		}
	}

	// Warns user of potential arbitrage paths for them to identify potential configuration issues
	private onInitialized() {
		logger.warn('AlgebraPoolArbitrageStrategy() initialized')
		logger.warn(`Potential arbitrage paths:`)

		const baseToken0Symbol = this.token0Arb.symbol
		const baseToken1Symbol = this.token1Arb.symbol
		const poolToken0Symbol = this.token0.symbol
		const poolToken1Symbol = this.token1.symbol

		logger.warn(
			`- ${baseToken0Symbol} -> ${poolToken0Symbol} -> ${poolToken1Symbol} -> ${baseToken1Symbol}`,
		)
		logger.warn(
			`- ${baseToken1Symbol} -> ${poolToken1Symbol} -> ${poolToken0Symbol} -> ${baseToken0Symbol}`,
		)

		logger.warn(
			'If this is not the desired path, please update the configuration',
		)
	}

	private async getTokenPrices() {
		const [price0, price1] = await Promise.all([
			GeckoTerminalAPI.getTokenPriceForChain(
				this.token0Arb.address,
				this.baseChain.geckoTerminalId,
			),
			GeckoTerminalAPI.getTokenPriceForChain(
				this.token1Arb.address,
				this.baseChain.geckoTerminalId,
			),
		])

		logger.info(`${this.token0Arb.symbol} price: $${price0}`)
		logger.info(`${this.token1Arb.symbol} price: $${price1}`)

		return { price0, price1 }
	}

	private async validateArbitrageOpportunity(
		initialOpportunity: ArbitrageOpportunity,
	) {
		const { price0, price1 } = await this.getTokenPrices()

		const updatedOpportunity = await this.findArbitrageOpportunity(
			price0,
			price1,
		)

		if (
			!updatedOpportunity ||
			updatedOpportunity.tokenIn.address !==
				initialOpportunity.tokenIn.address ||
			updatedOpportunity.potentialProfit < this.config.MIN_PROFIT_USD
		) {
			return false
		}

		return true
	}

	private async findArbitrageOpportunity(
		price0: number,
		price1: number,
	): Promise<ArbitrageOpportunity | null> {
		const { price } = await this.pool.getPrices()
		const priceRatio = price0 / price1
		const difference = this.calculatePriceDiff(price, priceRatio)

		logger.info(`Difference: ${difference.toFixed(2)}%`)

		if (Math.abs(difference) < this.config.MIN_SPREAD_PERCENT) {
			logger.info('No arbitrage opportunity found, skipping')
			return null
		}

		const tokenIn = price > priceRatio ? this.token0 : this.token1
		logger.info(`Token in: ${tokenIn.symbol}`)
		const tokenOut = tokenIn === this.token0 ? this.token1 : this.token0
		logger.info(`Token out: ${tokenOut.symbol}`)

		const tokenInPrice = tokenIn === this.token0 ? price0 : price1
		const tokenOutPrice = tokenOut === this.token0 ? price0 : price1

		const {
			amountIn,
			amountOut,
			amountInUSD,
			amountOutUSD,
			potentialProfit,
		} = await BatchQuoteOptimizer.optimizeAmountIn(
			tokenIn,
			tokenOut,
			tokenInPrice,
			tokenOutPrice,
			this.pool,
		)

		logger.info(
			`AmountIn: ${tokenIn.formatUnits(amountIn)}, ${tokenIn.symbol} ($${amountInUSD.toFixed(2)} USD)`,
		)
		logger.info(
			`Amount out: ${tokenOut.formatUnits(amountOut)}, ${tokenOut.symbol} ($${amountOutUSD.toFixed(2)} USD)`,
		)
		logger.warn(`Potential profit: $${potentialProfit.toFixed(2)} USD`)

		if (potentialProfit < this.config.MIN_PROFIT_USD) {
			logger.info(
				`Not enough profit ($${potentialProfit.toFixed(2)}), skipping`,
			)
			return null
		}

		const tokenInArbAddress =
			price > priceRatio ? this.token0Arb.address : this.token1Arb.address
		const tokenOutArbAddress =
			price > priceRatio ? this.token1Arb.address : this.token0Arb.address

		const tokenInArb = await TokenUtils.fromAddress(
			tokenInArbAddress,
			this.baseChain.id,
		)
		const tokenOutArb = await TokenUtils.fromAddress(
			tokenOutArbAddress,
			this.baseChain.id,
		)

		return {
			tokenIn,
			tokenOut,
			amountIn,
			amountOut,
			potentialProfit,
			tokenInArb,
			tokenOutArb,
		}
	}

	private async executeArbitrage(opportunity: ArbitrageOpportunity) {
		const account = getAccountAddress()
		const {
			tokenIn,
			tokenOut,
			amountIn,
			amountOut,
			tokenInArb,
			tokenOutArb,
		} = opportunity

		// 0. Swap baseToken for tokenInArb, if needed
		// if (this.baseToken.address !== tokenInArb.address) {
		// 	let tokenToSwap = this.baseToken

		// 	if (this.baseToken instanceof NativeCurrency) {
		// 		const weth = new WETH(WETH_ARB, this.baseChain.id)
		// 		await weth.deposit(amountIn)
		// 		tokenToSwap = weth as Token
		// 	}

		// 	const swapTx = await this.baseChainPool.swap({
		// 		tokenIn: tokenToSwap as Token,
		// 		tokenOut: tokenInArb as Token,
		// 		amountIn: amountIn,
		// 		slippage: this.config.SLIPPAGE,
		// 	})

		// 	logger.info(
		// 		`Swapped ${this.baseToken.symbol} for ${tokenInArb.symbol}: ${swapTx.receipt.transactionHash}`,
		// 	)
		// }

		// 1. Bridge token from Base Chain to Opportunity Chain
		let bridgeTx: StargateBridgeTx | FuseBridgeTx

		if (tokenInArb.address === WBTC_ARB && this.pool.chainId === fuse.id) {
			bridgeTx = await FuseBridge.bridge(
				tokenInArb as Token,
				this.pool.chainId,
				account,
				amountIn,
			)
		} else {
			bridgeTx = await Stargate.send(
				tokenInArb,
				amountIn,
				account,
				this.pool.chainId,
			)
		}
		logger.info(
			`Bridged ${tokenInArb.symbol} from ${this.baseChain.name} to ${this.pool.chainId}: ${bridgeTx.hash}`,
		)
		await bridgeTx.waitForBridgeToFinish()
		logger.info(
			`Bridge ${tokenInArb.symbol} to ${this.pool.chainId} finished: ${bridgeTx.hash}`,
		)

		// 1.5. Check that arbitrage opportunity is still valid
		const isValid = await this.validateArbitrageOpportunity(opportunity)

		if (!isValid) {
			logger.info('Arbitrage opportunity is no longer valid, skipping')
			return
		}

		// 2. Swap on target chain
		const swapTx = await this.pool.swap({
			tokenIn,
			tokenOut,
			amountIn,
			slippage: this.config.SLIPPAGE,
		})
		logger.info(
			`Swapped ${tokenIn.symbol} for ${tokenOut.symbol}: ${swapTx.receipt.transactionHash}`,
		)

		// 3. Bridge back to Base Chain
		let bridgeBackTx: StargateBridgeTx | FuseBridgeTx

		if (tokenOutArb.address === WBTC_ARB && this.pool.chainId === fuse.id) {
			bridgeBackTx = await FuseBridge.bridge(
				tokenOut,
				this.baseChain.id,
				account,
				amountOut,
			)
		} else {
			bridgeBackTx = await Stargate.send(
				tokenOut,
				amountOut,
				account,
				this.baseChain.id,
			)
		}

		logger.info(
			`Bridged ${tokenOut.symbol} back to ${this.baseChain.name}: ${bridgeBackTx.hash}`,
		)
		await bridgeBackTx.waitForBridgeToFinish()
		logger.info(
			`Bridge ${tokenOut.symbol} to ${this.baseChain.name}: ${bridgeBackTx.hash} finished`,
		)

		// 4. Sell tokenOutArb for baseToken, if needed
		// if (tokenOutArb.address !== this.baseToken.address) {
		// 	const tokenToGet =
		// 		this.baseToken instanceof NativeCurrency ? WETH : this.baseToken

		// 	const swapTx = await this.baseChainPool.swap({
		// 		tokenIn: tokenOutArb as Token,
		// 		tokenOut: tokenToGet as Token,
		// 		amountIn: amountOut,
		// 		slippage: this.config.SLIPPAGE,
		// 	})

		// 	logger.info(
		// 		`Swapped ${tokenOutArb.symbol} for ${this.baseToken.symbol}: ${swapTx.receipt.transactionHash}`,
		// 	)
		// }

		const tokenOutArbBalance = await tokenOutArb.balanceOf(account)

		const tokenOutArbPrice = await GeckoTerminalAPI.getTokenPriceForChain(
			tokenOutArb.address,
			this.baseChain.geckoTerminalId,
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
			const { price0, price1 } = await this.getTokenPrices()

			// Find opportunity
			const opportunity = await this.findArbitrageOpportunity(
				price0,
				price1,
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
			logger.error('Error executing arbitrage')
			console.error(error)
			throw error
		}
	}
}
