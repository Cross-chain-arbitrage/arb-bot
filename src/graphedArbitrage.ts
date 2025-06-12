import { ContractFunctionExecutionError } from 'viem'
import { arbitrum } from 'viem/chains'
import { PoolType } from './dex/PoolUtils'
import { UniV3Pool } from './dex/uniswapV3/Pool'
import { Token } from './primitives/tokens/Token'
import { TokenUtils } from './primitives/tokens/TokenUtils'
import { FuseWbtcGraphStrategy } from './strategies/FuseWbtcGraphStrategy'

/* ============ Tokens ============ */

const WBTC_ARB_ADDR = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
const WETH_FUSE_ADDR = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590'
const WETH_ARB_ADDR = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
const WBTC_FUSE_ADDR = '0x33284f95ccb7B948d9D352e1439561CF83d8d00d'

/* ============ Pools ============ */

const FUSE_POOL = '0x35E6083f8Fc3a5698942fa02Ebbf1E5D44a71992'
const FUSE_POOL_TYPE = PoolType.ALGEBRA
const ARB_POOL = '0x2f5e87C9312fa29aed5c179E456625D79015299c'
const ARB_POOL_TYPE = PoolType.UNIV3

/* ============ Constants ============ */

async function main() {
	const pool = await UniV3Pool.create(ARB_POOL, arbitrum.id)

	console.log('Pool created')

	const WETH = await TokenUtils.fromAddress<Token>(WETH_ARB_ADDR, arbitrum.id)
	const WBTC = await TokenUtils.fromAddress<Token>(WBTC_ARB_ADDR, arbitrum.id)

	console.log('Tokens created')

	try {
		const { amountOut } = await pool.quoteSwap({
			tokenIn: WETH,
			tokenOut: WBTC,
			amountIn: WETH.parseUnits('0.000000000001'),
		})
		console.log('Amount out:', amountOut)
	} catch (error) {
		if (error instanceof ContractFunctionExecutionError) {
			console.error({ ...error, abi: undefined })
			process.exit(1)
		}
	}

	const strategy = await FuseWbtcGraphStrategy.setup()

	const startToken = await TokenUtils.getNative(arbitrum.id)
	const startAmount = startToken.parseUnits('0.000000000001')

	const path = await strategy.findPath(startToken, startAmount)

	console.log(path)
}

main()
	.then(() => {
		process.exit(0)
	})
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
