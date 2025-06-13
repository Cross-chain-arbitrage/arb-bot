import { zeroAddress } from 'viem'
import { arbitrum, fuse } from 'viem/chains'
import { TokenUtils } from '../../../primitives/tokens/TokenUtils'
import { ClientManager } from '../../../utils/ClientManager'
import { getAccountAddress } from '../../../utils/getAccount'
import logger from '../../../utils/logger'
import { Stargate } from '../Stargate'

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
	const fromChain = ClientManager.findChainByName(fromChainName)
	if (!fromChain) {
		logger.error("Invalid 'fromChain' name")
		process.exit(1)
	}

	logger.info(`From Chain: ${fromChain.name} (${fromChain.id})`)

	const toChain = ClientManager.findChainByName(toChainName)
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

	const res = await Stargate.bridge(tokenIn, toChain.id, recipient, amountIn)

	logger.info(`TxHash: ${res.bridgeTx.srcTxHash}`)
	await res.bridgeTx.waitForBridgeToFinish()
	logger.info(`DstTxHash: ${res.bridgeTx.srcTxHash}`)
}

send().catch(console.error)
