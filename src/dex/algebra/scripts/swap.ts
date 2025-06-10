import { fuse } from 'viem/chains'
import { AlgebraPool } from '../Pool'
import { TokenUtils } from '../../../primitives/tokens/TokenUtils'
import { Token } from '../../../primitives/tokens/Token'
import { getAccountAddress } from '../../../utils/getAccount'
import { GeckoTerminalAPI } from '../../../data-apis/geckoterminal/GeckoTerminalAPI'
import logger from '../../../utils/logger'

async function swap() {
	const poolAddress = '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992' // WETH/WBTC pool

	const pool = await AlgebraPool.create(poolAddress, fuse.id)

	const weth = await TokenUtils.fromAddress<Token>(
		'0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590',
		fuse.id,
	)
	const wbtc = await TokenUtils.fromAddress<Token>(
		'0x34009565bfEeFded0F7e774629a745636Bf35E82',
		fuse.id,
	)

	const account = getAccountAddress()

	const balance = await weth.balanceOf(account)

	const params: SwapParams = {
		tokenIn: weth,
		tokenOut: wbtc,
		amountIn: balance,
	}

	const { amountOut } = await pool.simulateSwap(params)

	const priceETH = await GeckoTerminalAPI.getTokenPriceETH()
	const priceBTC = await GeckoTerminalAPI.getTokenPriceBTC()

	const amountInUSD = Number(weth.formatUnits(balance)) * priceETH
	logger.info(`ETH price: $${priceETH}`)
	const amountOutUSD = Number(wbtc.formatUnits(amountOut)) * priceBTC
	logger.info(`BTC price: $${priceBTC}`)

	logger.info(`AmountIn: ${weth.formatUnits(balance)} ($${amountInUSD} USD)`)
	logger.info(
		`Amount out: ${wbtc.formatUnits(amountOut)} ($${amountOutUSD} USD)`,
	)

	logger.info(`Potential profit: $${amountOutUSD - amountInUSD} USD`)
}

swap().catch(console.error)
