import * as chains from 'viem/chains'
import { zeroAddress } from 'viem'
import { TokenUtils } from '../../utils/tokens/TokenUtils'
import { Stargate } from '../Stargate'
import { getAccountAddress } from '../../utils/getAccount'
import { arbitrum } from 'viem/chains'
import { fuse } from 'viem/chains'
import logger from '../../utils/logger'

const TOKEN_IN_SYMBOLS: string[] = ['ETH', 'USDC', 'USDT']

const TOKEN_IN_ADDRESSES: Record<string, Record<number, Address>> = {
	ETH: {
		[fuse.id]: '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590',
		[arbitrum.id]: zeroAddress,
	},
	USDC: {
		[fuse.id]: '0x0000000000000000000000000000000000000000',
		[arbitrum.id]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
	},
	USDT: {
		[fuse.id]: '0x0000000000000000000000000000000000000000',
		[arbitrum.id]: '0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7',
	},
}

async function send() {
	// Parse CLI arguments
	const args = process.argv.slice(2)

	if (args.length !== 4) {
		console.error(
			'Usage: npx tsx send.ts <tokenInSymbol> <fromChain> <toChain> <amount|balance>',
		)
		process.exit(1)
	}

	const [tokenInSymbol, fromChainName, toChainName, amount] = args

	if (!TOKEN_IN_SYMBOLS.includes(tokenInSymbol)) {
		console.error(
			'Invalid tokenIn symbol, allowed: ' + TOKEN_IN_SYMBOLS.join(', '),
		)
		process.exit(1)
	}

	// Find chains by name
	const fromChain = getChainByName(fromChainName)
	if (!fromChain) {
		logger.error("Invalid 'fromChain' name")
		process.exit(1)
	}

	logger.info(`From Chain: ${fromChain.name} (${fromChain.id})`)

	const toChain = getChainByName(toChainName)
	if (!toChain) {
		logger.error("Invalid 'toChain' name " + toChainName)
		process.exit(1)
	}

	logger.info(`To Chain: ${toChain.name} (${toChain.id})`)

	// Get token address based on symbol
	const tokenInAddress = TOKEN_IN_ADDRESSES[tokenInSymbol][fromChain.id]

	if (!tokenInAddress) {
		logger.error("Invalid 'tokenInAddress'")
		process.exit(1)
	}

	const recipient = getAccountAddress()
	const tokenIn = await TokenUtils.fromAddress(tokenInAddress, fromChain.id)

	// Handle amount
	let amountIn: bigint

	if (amount.toLowerCase() === 'balance') {
		amountIn = await tokenIn.balanceOf(recipient)
	} else {
		try {
			amountIn = tokenIn.parseUnits(amount)
		} catch (e) {
			logger.error(
				"Invalid 'amount' format" + '\n' + (e as Error).message,
			)
			process.exit(1)
		}
	}

	logger.info(
		`Sending ${tokenIn.formatUnits(amountIn)} of ${tokenIn.symbol} to ${toChain.id}`,
	)

	const bridgeTx = await Stargate.send(
		tokenIn,
		amountIn,
		recipient,
		toChain.id,
	)

	logger.info(`TxHash: ${bridgeTx.hash}`)
	await bridgeTx.waitForBridgeToFinish()
	logger.info(`DstTxHash: ${bridgeTx.dstTxHash}`)
}

function getChainByName(chainName: string) {
	const chain = Object.values(chains).find((chain) => {
		if (chain.name.toLowerCase().includes('testnet')) return false
		return chain.name.toLowerCase().includes(chainName.toLowerCase())
	})
	return chain
}

send().catch(console.error)
