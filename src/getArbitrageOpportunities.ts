import {
	Address,
	ContractFunctionExecutionError,
	isAddress,
	withRetry,
} from 'viem'
import { GeckoTerminalAPI } from './data-apis/geckoterminal/GeckoTerminalAPI'
import { PoolType, PoolUtils } from './dex/PoolUtils'
import { findArbOpportunity } from './optimize'
import { poolsByChain } from './pools'
import { Token } from './primitives/tokens/Token'
import { ClientManager } from './utils/ClientManager'

interface PoolPriceData {
	token0: Token
	token1: Token
	price0To1: number
	price1To0: number
	reserve0: bigint
	reserve1: bigint
}

interface Pool {
	type: PoolType
	address: Address
	chainName?: string
	priceData?: PoolPriceData
}

interface TokenPrices {
	BTC: number
	ETH: number
	USD: number
	FUSE: number
	// RIF: number
}

export interface ArbitrageOpportunity {
	pool: Pool
	token0Symbol: string
	token1Symbol: string
	expectedPrice: number
	actualPrice: number
	priceDiffPercent: number
	potentialProfit?: {
		tokenIn: Token
		tokenOut: Token
		amountIn: bigint
		amountOut: bigint
		amountInUSD: number
		amountOutUSD: number
		profitUSD: number
	}
}

/* ======== Main Function ======== */

export async function getArbitrageOpportunities(): Promise<
	ArbitrageOpportunity[]
> {
	console.time('getPoolStats')

	const chainIds = Object.keys(poolsByChain).map((el) => Number(el))

	const updates: Promise<void>[] = []

	for (const chainId of chainIds) {
		updates.push(updatePoolsPriceData(poolsByChain[chainId], chainId))
	}

	await Promise.all(updates)

	// const priceUSDT = 1
	// const priceUSDC = 1

	const retryOptions = {
		retryCount: 3,
		delay: 1000,
	}

	const priceBTC = await withRetry(
		() => GeckoTerminalAPI.getTokenPriceBTC(),
		retryOptions,
	)
	const priceETH = await withRetry(
		() => GeckoTerminalAPI.getTokenPriceETH(),
		retryOptions,
	)
	const priceFUSE = await withRetry(
		() =>
			GeckoTerminalAPI.getTokenPrice(
				'0x970b9bb2c0444f5e81e9d0efb84c8ccdcdcaf84d',
			),
		retryOptions,
	)

	console.log('\npriceBTC', priceBTC)
	console.log('priceETH', priceETH)
	console.log('priceFUSE', priceFUSE, '\n')

	const promises: Promise<ArbitrageOpportunity[]>[] = []

	for (const chainId of chainIds) {
		const pools = poolsByChain[chainId]
		promises.push(
			findArbitrageOpportunities(pools, priceBTC, priceETH, priceFUSE),
		)
	}

	const opportunities = (await Promise.all(promises)).flat()

	logArbitrageOpportunities(opportunities.flat())

	console.timeEnd('getPoolStats')

	return opportunities
}

async function updatePoolsPriceData(pools: Pool[], chainId: number) {
	for (const pool of pools) {
		if (!isAddress(pool.address)) {
			pool.address = (pool.address as string).toLowerCase() as Address
		}

		try {
			pool.chainName = ClientManager.findChainById(chainId)?.name

			if (pool.type === PoolType.UNKNOWN) {
				console.warn(
					`Pool ${pool.address}:${pool.chainName} has unknown pool type`,
				)
				continue
			}

			const Pool = await PoolUtils.createPool(
				pool.address,
				chainId,
				pool.type,
			)
			const { price } = await Pool.getPrices()
			const [reserve0, reserve1] = await Promise.all([
				Pool.token0.balanceOf(Pool.address),
				Pool.token1.balanceOf(Pool.address),
			])

			if (price !== null) {
				pool.priceData = {
					token0: Pool.token0,
					token1: Pool.token1,
					price0To1: price,
					price1To0: 1 / price,
					reserve0,
					reserve1,
				}
			}
		} catch (error) {
			console.error(
				`Error getting pool prices for pool ${pool.address}:`,
				error,
			)
		}
	}
}

function calculatePriceDiff(
	actualPrice: number,
	expectedPrice: number,
): number {
	return (actualPrice / expectedPrice) * 100 - 100
}

const STABLECOIN_SYMBOLS = ['USDT', 'USDC', 'DAI', 'DOC']

export function getTokenCategory(symbol: string): keyof TokenPrices | null {
	if (symbol.includes('BTC')) return 'BTC'
	if (symbol.includes('ETH')) return 'ETH'
	if (STABLECOIN_SYMBOLS.includes(symbol) || symbol.includes('USD'))
		return 'USD'
	if (symbol.includes('FUSE')) return 'FUSE'
	return null
}

function calculateExpectedPrice(
	token0Category: keyof TokenPrices,
	token1Category: keyof TokenPrices,
	prices: TokenPrices,
): number {
	return prices[token0Category] / prices[token1Category]
}

async function findArbitrageOpportunities(
	pools: Pool[],
	priceBTC: number,
	priceETH: number,
	priceFUSE: number,
): Promise<ArbitrageOpportunity[]> {
	const prices: TokenPrices = {
		BTC: priceBTC,
		ETH: priceETH,
		USD: 1,
		FUSE: priceFUSE,
	}

	const opportunities: ArbitrageOpportunity[] = []

	for (const pool of pools) {
		if (!pool.priceData) {
			console.warn(
				`Pool ${pool.address}:${pool.chainName} has no price data`,
			)
			continue
		}

		const { token0, token1, price0To1 } = pool.priceData
		const token0Cat = getTokenCategory(token0.symbol)
		const token1Cat = getTokenCategory(token1.symbol)

		if (!token0Cat || !token1Cat) {
			console.warn(
				`Pool ${pool.address} has unsupported tokens: ${token0.symbol}/${token1.symbol}\n`,
			)
			continue
		}

		const expectedPrice = calculateExpectedPrice(
			token0Cat,
			token1Cat,
			prices,
		)
		const priceDiff = calculatePriceDiff(price0To1, expectedPrice)

		const opportunity: ArbitrageOpportunity = {
			pool,
			token0Symbol: token0.symbol,
			token1Symbol: token1.symbol,
			expectedPrice,
			actualPrice: price0To1,
			priceDiffPercent: priceDiff,
		}

		// Calculate potential profit
		try {
			const tickPool = await PoolUtils.createPool(
				pool.address,
				pool.priceData.token0.chainId,
				pool.type,
			)

			const profitData = await findArbOpportunity(
				tickPool,
				prices[token0Cat],
				prices[token1Cat],
			)
			if (profitData) {
				opportunity.potentialProfit = {
					tokenIn: profitData.tokenIn,
					tokenOut: profitData.tokenOut,
					amountIn: profitData.amountIn,
					amountOut: profitData.amountOut,
					amountInUSD: profitData.amountInUSD,
					amountOutUSD: profitData.amountOutUSD,
					profitUSD: profitData.potentialProfit,
				}
			}
		} catch (error) {
			if (error instanceof ContractFunctionExecutionError) {
				const shortErr = new ContractFunctionExecutionError(
					error.cause,
					{
						abi: [],
						args: error.args,
						contractAddress: error.contractAddress,
						functionName: error.functionName,
						sender: error.sender,
					},
				)
				console.error(shortErr.shortMessage)
			} else {
				console.error(
					`Error calculating profit for pool ${pool.address}:${pool.chainName}`,
					error,
				)
			}
		}

		opportunities.push(opportunity)
	}

	return opportunities
}

function logArbitrageOpportunities(
	opportunities: ArbitrageOpportunity[],
): void {
	opportunities.sort(
		(a, b) => Math.abs(a.priceDiffPercent) - Math.abs(b.priceDiffPercent),
	)
	opportunities.forEach((opp) => {
		const { reserve0, reserve1 } = opp.pool.priceData!
		const formattedReserve0 =
			opp.pool.priceData!.token0.formatUnits(reserve0)
		const formattedReserve1 =
			opp.pool.priceData!.token1.formatUnits(reserve1)

		console.log(
			`${opp.token0Symbol}/${opp.token1Symbol} in pool ${opp.pool.address} (${opp.pool.type}):`,
			`\n  Expected: ${opp.expectedPrice}`,
			`\n  Actual: ${opp.actualPrice}`,
			`\n  Difference: ${opp.priceDiffPercent.toFixed(2)}%`,
			`\n  Chain: ${opp.pool.chainName}`,
			`\n  Liquidity: ${formattedReserve0} ${opp.token0Symbol} / ${formattedReserve1} ${opp.token1Symbol}`,
		)

		if (opp.potentialProfit) {
			console.log(
				`\n  Potential Profit:`,
				`\n    Input: ${opp.potentialProfit.tokenIn.formatUnits(opp.potentialProfit.amountIn)} ${opp.potentialProfit.tokenIn.symbol} ($${opp.potentialProfit.amountInUSD.toFixed(2)})`,
				`\n    Output: ${opp.potentialProfit.tokenOut.formatUnits(opp.potentialProfit.amountOut)} ${opp.potentialProfit.tokenOut.symbol} ($${opp.potentialProfit.amountOutUSD.toFixed(2)})`,
				`\n    Profit: $${opp.potentialProfit.profitUSD.toFixed(2)} USD`,
			)
		}

		console.log('\n--------------------------------')
	})
}
