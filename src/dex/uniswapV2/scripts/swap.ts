import { rootstock } from 'viem/chains'
import { getAccountAddress } from '../../../utils/getAccount'

import logger from '../../../utils/logger'
import { UniV2Pool } from '../Pool'

async function swap() {
	const poolAddress = '0xa89a86d3d9481a741833208676fa57d0f1d5c6cb' // RIF/USDT pool

	const pool = await UniV2Pool.create(poolAddress, rootstock.id)

	const swapToRIF = true

	const tokenIn = swapToRIF ? pool.token1 : pool.token0
	const tokenOut = swapToRIF ? pool.token0 : pool.token1

	const account = getAccountAddress()

	const balance = await tokenIn.balanceOf(account)

	const params: SwapParams = {
		tokenIn,
		tokenOut,
		amountIn: balance,
	}

	if ((await tokenIn.allowance(account, pool.routerAddress)) < balance) {
		await tokenIn.approve(pool.routerAddress, balance)
	}

	logger.info(`Approving ${tokenIn.symbol} to ${pool.routerAddress}`)

	logger.info(`Token in: ${tokenIn.symbol} (${tokenIn.address})`)
	logger.info(`Token out: ${tokenOut.symbol} (${tokenOut.address})`)

	logger.info(`Swapping ${tokenIn.symbol} to ${tokenOut.symbol}`)

	const { amountOut } = await pool.simulateSwap(params)

	const priceTokenIn = 1
	const priceTokenOut = 0.05268

	const amountInUSD = Number(tokenIn.formatUnits(balance)) * priceTokenIn
	logger.info(`${tokenIn.symbol} price: $${priceTokenIn}`)
	const amountOutUSD = Number(tokenOut.formatUnits(amountOut)) * priceTokenOut
	logger.info(`${tokenOut.symbol} price: $${priceTokenOut}`)

	logger.info(
		`AmountIn: ${tokenIn.formatUnits(balance)} ($${amountInUSD} USD)`,
	)
	logger.info(
		`Amount out: ${tokenOut.formatUnits(amountOut)} ($${amountOutUSD} USD)`,
	)

	logger.info(`Potential profit: $${amountOutUSD - amountInUSD} USD`)
}

swap().catch(console.error)
