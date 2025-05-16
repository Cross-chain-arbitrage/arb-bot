import { AlgebraPool } from './dex/algebra/Pool'
import { Token } from './utils/tokens/Token'
import { getAccountAddress } from './utils/getAccount'
import { GeckoTerminalAPI } from './geckoterminal/GeckoTerminalAPI'
import { Stargate } from './stargate/Stargate'
import logger from './utils/logger'
import { GeckoTerminalChainId } from './geckoterminal/chains'
import { TokenUtils } from './utils/tokens/TokenUtils'
import { NativeCurrency } from './utils/tokens/NativeCurrency'
import { FuseBridge } from './fuse/bridge/FuseBridge'
import { FuseBridgeTx } from './fuse/bridge/FuseBridgeTx'
import { StargateBridgeTx } from './stargate/StargateBridgeTx'
import { fuse } from 'viem/chains'
import { WBTC_ARB } from './run'

/* ======== TYPES ======== */

export interface ArbitrageConfig {
	MIN_SPREAD_PERCENT: number
	ARBITRAGE_AMOUNT_USD: number
	MIN_PROFIT_USD: number
	SLIPPAGE: number
}

export interface ArbitrageOpportunity {
	tokenIn: Token
	tokenInArb: Token | NativeCurrency
	tokenOut: Token
	tokenOutArb: Token | NativeCurrency
	amountIn: bigint
	amountOut: bigint
	potentialProfit: number
}

export interface ImmutablesConfig {
	baseChain: {
		id: number
		name: string
		geckoTerminalId: GeckoTerminalChainId
	}
	poolAddress: Address
	poolChainId: number
}

/* ======== CLASS ======== */

export class AlgebraPoolArbitrageStrategy {
	private readonly config: ArbitrageConfig
	private readonly immutables: ImmutablesConfig
	private pool: AlgebraPool
	private token0: Token
	private token1: Token
	private token0Arb: Token | NativeCurrency
	private token1Arb: Token | NativeCurrency

	constructor(
		config: ArbitrageConfig,
		immutables: ImmutablesConfig,
		pool: AlgebraPool,
		token0Arb: Token | NativeCurrency,
		token1Arb: Token | NativeCurrency,
	) {
		this.config = config
		this.immutables = immutables
		this.pool = pool
		this.token0 = pool.token0
		this.token1 = pool.token1
		this.token0Arb = token0Arb
		this.token1Arb = token1Arb

		// Call initialization note
		this.onInitialized()
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
				this.immutables.baseChain.geckoTerminalId,
			),
			GeckoTerminalAPI.getTokenPriceForChain(
				this.token1Arb.address,
				this.immutables.baseChain.geckoTerminalId,
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
		const arbitrageAmount = this.config.ARBITRAGE_AMOUNT_USD / tokenInPrice

		const amountIn = tokenIn.parseUnits(arbitrageAmount.toString())
		const { amountOut } = await this.pool.quoteSwap({
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
			price > priceRatio ? this.token0Arb.address : this.token1Arb.address
		const tokenOutArbAddress =
			price > priceRatio ? this.token1Arb.address : this.token0Arb.address

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
			`Bridged ${tokenInArb.symbol} from ${this.immutables.baseChain.name} to ${this.pool.chainId}: ${bridgeTx.hash}`,
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
				tokenOutArb as Token,
				this.immutables.baseChain.id,
				account,
				amountOut,
			)
		} else {
			bridgeBackTx = await Stargate.send(
				tokenOut,
				amountOut,
				account,
				this.immutables.baseChain.id,
			)
		}

		logger.info(
			`Bridged ${tokenOut.symbol} back to ${this.immutables.baseChain.name}: ${bridgeBackTx.hash}`,
		)
		await bridgeBackTx.waitForBridgeToFinish()
		logger.info(
			`Bridge ${tokenOut.symbol} to ${this.immutables.baseChain.name}: ${bridgeBackTx.hash} finished`,
		)

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
