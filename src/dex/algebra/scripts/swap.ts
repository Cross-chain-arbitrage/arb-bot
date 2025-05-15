import { fuse } from "viem/chains"
import { AlgebraPool } from "../Pool"
import { TokenUtils } from "../../../utils/tokens/TokenUtils"
import { Token } from "../../../utils/tokens/Token"
import { getAccountAddress } from "../../../utils/getAccount"
import { GeckoTerminalAPI } from "../../../geckoterminal/GeckoTerminalAPI"

async function swap() {
	const poolAddress = "0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992" // WETH/WBTC pool

	const pool = await AlgebraPool.create(poolAddress, fuse.id)

	const weth = await TokenUtils.fromAddress<Token>(
		"0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590",
		fuse.id,
	)
	const wbtc = await TokenUtils.fromAddress<Token>(
		"0x34009565bfEeFded0F7e774629a745636Bf35E82",
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
	console.log(`ETH price: $${priceETH}`)
	const amountOutUSD = Number(wbtc.formatUnits(amountOut)) * priceBTC
	console.log(`BTC price: $${priceBTC}`)

	console.log(`AmountIn: ${weth.formatUnits(balance)} ($${amountInUSD} USD)`)
	console.log(
		`Amount out: ${wbtc.formatUnits(amountOut)} ($${amountOutUSD} USD)`,
	)

	console.log(`Potential profit: $${amountOutUSD - amountInUSD} USD`)
	// console.log(`Args: ${args}`)
}

swap().catch(console.error)
