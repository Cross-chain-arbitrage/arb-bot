import { PublicClient, WalletClient } from 'viem'
import { Token } from '../../utils/tokens/Token'
import { pegswapAbi } from '../../abi/pegswap'
import logger from '../../utils/logger'

const pegswapContract = '0xFa70dFFeA090fED2d6E9301fB10b0d4C81072E4c'

const tokens: Token[] = [
	new Token(
		'0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590',
		122,
		'WETH',
		18,
		'WETH',
	),
	new Token(
		'0xc6Bc407706B7140EE8Eef2f86F9504651b63e7f9',
		122,
		'USDC.e',
		6,
		'USDC.e',
	),
	new Token(
		'0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7',
		122,
		'USDT',
		6,
		'USDT',
	),
	new Token(
		'0x68c9736781E9316ebf5c3d49FE0C1f45D2D104Cd',
		122,
		'USDT',
		6,
		'Tether USD',
	),
	new Token(
		'0x28C3d1cD466Ba22f6cae51b1a4692a831696391A',
		122,
		'USD Coin',
		6,
		'USDC',
	),
	new Token(
		'0x5622F6dC93e08a8b717B149677930C38d5d50682',
		122,
		'Wrapped Ether',
		18,
		'WETH',
	),
]

async function swap(
	tokenIn: Token,
	tokenOut: Token,
	amountIn: bigint,
	publicClient: PublicClient,
	client: WalletClient,
) {
	if (!isInList(tokenIn, tokens)) throw new Error('Token in not supported')
	if (!isInList(tokenOut, tokens)) throw new Error('Token out not supported')

	const tokenInAddress = tokenIn.address
	const tokenOutAddress = tokenOut.address

	const swappableAmount = await publicClient.readContract({
		address: pegswapContract,
		abi: pegswapAbi,
		functionName: 'getSwappableAmount',
		args: [tokenOutAddress, tokenInAddress],
	})

	logger.info(`Swapping ${tokenInAddress} to ${tokenOutAddress}`)
	logger.info(`Amount in: ${amountIn}`)
	logger.info(`Swappable amount: ${swappableAmount}`)

	if (swappableAmount < amountIn) {
		throw new Error('Insufficient liquidity on PegSwap contract')
	}

	await client.writeContract({
		to: pegswapContract,
		abi: pegswapAbi,
		functionName: 'swap',
		args: [amountIn, tokenInAddress, tokenOutAddress],
	})

	logger.info(`Amount out: ${amountOut}`)

	return amountOut
}

function isInList(token: Token, list: Token[]) {
	return list.some(
		(t) => t.address === token.address && t.chainId === token.chainId,
	)
}
