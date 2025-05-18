import { Address } from 'viem'
import { apeChain, fuse, hemi, lightlinkPhoenix } from 'viem/chains'
import { Token } from './utils/tokens/Token'
import { GeckoTerminalAPI } from './geckoterminal/GeckoTerminalAPI'
import { PoolType, PoolUtils } from './dex/PoolUtils'
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
}

interface ArbitrageOpportunity {
	pool: Pool
	token0Symbol: string
	token1Symbol: string
	expectedPrice: number
	actualPrice: number
	priceDiffPercent: number
}

/* ======== Main Function ======== */

async function main() {
	console.time('getPoolStats')

	const chainIds = [hemi.id, lightlinkPhoenix.id, fuse.id]

	const poolByChain: Record<number, Pool[]> = {
		[apeChain.id]: [
			// {
			// 	type: PoolType.ALGEBRA,
			// 	address: "0xbd04919285728923e298f898294319a84a0dbd1e",
			// },
			{
				type: PoolType.ALGEBRA,
				address: '0xc82b890744d7df5f4fe28dd4205edcc36ceeea50',
			},
			// {
			// 	type: PoolType.ALGEBRA,
			// 	address: "0x674843C06FF83502ddb4D37c2E09C01cdA38cbc8",
			// },
			// {
			// 	type: PoolType.ALGEBRA,
			// 	address: "0xf4D9235269a96aaDaFc9aDAe454a0618eBE37949",
			// },
		],
		[hemi.id]: [
			{
				type: PoolType.UNIV3,
				address: '0xdA44564DF732dECfd93Ba8539803C5a8dF241954',
			},
			{
				type: PoolType.UNIV3,
				address: '0x3EcabBa99bEF583B58b8f0af6dD853CD9ED75ce3',
			},
			{
				type: PoolType.UNIV3,
				address: '0x9580D4519C9F27642e21085E763E761a74eF3735',
			},
			{
				type: PoolType.UNIV3,
				address: '0x3e014A9EF5F45454d9BdDb15741ce8A04e7d96F5',
			},
			{
				type: PoolType.UNIV3,
				address: '0xB46335cAcCccb3fDC2A3F40D9Fd253F5F76919A0',
			},
			{
				type: PoolType.UNIV3,
				address: '0xc36a310BD93E2927452de563fAAA89A86822a21f',
			},
		],
		[lightlinkPhoenix.id]: [
			{
				type: PoolType.UNIV3,
				address: '0x2288627C696010049f6D98a84fC10F9C5F7b3Ce2',
			},
			{
				type: PoolType.UNIV3,
				address: '0x1125452469E9B9A36FE69249309fCe8925C3eEDa',
			},
		],
		[fuse.id]: [
			{
				type: PoolType.ALGEBRA,
				address: '0x677409B2393E2ca19b454fB904F5E634E21D3D89',
			},
			{
				type: PoolType.ALGEBRA,
				address: '0x23518Ca19447E7ABB8C6f6eb215A1D663c53Ea21',
			},
			{
				type: PoolType.ALGEBRA,
				address: '0x5E174874C5bc45Ba96bD859A6edA4D34EE9f4424',
			},
			{
				type: PoolType.ALGEBRA,
				address: '0x06b6949Fca3706c25A312c1104B7e4fa11ce0BB6',
			},
			{
				type: PoolType.ALGEBRA,
				address: '0x51cC986Df4C54877E0Cd9122532db389cc60016B',
			},
			{
				type: PoolType.ALGEBRA,
				address: '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992',
			},
		],
	}

	for (const chainId of chainIds) {
		await updatePoolsPriceData(poolByChain[chainId], chainId)
	}

	// const priceUSDT = 1
	// const priceUSDC = 1

	const priceBTC = await GeckoTerminalAPI.getTokenPrice(
		'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
	)
	const priceETH = await GeckoTerminalAPI.getTokenPrice(
		'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
	)
	const priceFUSE = await GeckoTerminalAPI.getTokenPrice(
		'0x970b9bb2c0444f5e81e9d0efb84c8ccdcdcaf84d',
	)

	console.log('\npriceBTC', priceBTC)
	console.log('priceETH', priceETH)
	console.log('priceFUSE', priceFUSE, '\n')
	const opportunities: ArbitrageOpportunity[] = []

	for (const chainId of chainIds) {
		const pools = poolByChain[chainId]

		const opportunitiesOnChain = findArbitrageOpportunities(
			pools,
			priceBTC,
			priceETH,
			priceFUSE,
		)
		opportunities.push(...opportunitiesOnChain)
	}

	logArbitrageOpportunities(opportunities)

	console.timeEnd('getPoolStats')
}

async function updatePoolsPriceData(pools: Pool[], chainId: number) {
	for (const pool of pools) {
		try {
			pool.chainName = ClientManager.findChainById(chainId)?.name

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

function getTokenCategory(symbol: string): keyof TokenPrices | null {
	if (symbol.includes('BTC')) return 'BTC'
	if (symbol.includes('ETH')) return 'ETH'
	if (symbol.includes('USD') || symbol.includes('DAI')) return 'USD'
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

function findArbitrageOpportunities(
	pools: Pool[],
	priceBTC: number,
	priceETH: number,
	priceFUSE: number,
): ArbitrageOpportunity[] {
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

		opportunities.push({
			pool,
			token0Symbol: token0.symbol,
			token1Symbol: token1.symbol,
			expectedPrice,
			actualPrice: price0To1,
			priceDiffPercent: priceDiff,
		})
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
			'\n--------------------------------',
		)
	})
}

main().catch(console.error)
