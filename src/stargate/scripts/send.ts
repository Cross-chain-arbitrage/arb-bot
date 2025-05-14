import { arbitrum, fuse } from "viem/chains"
import { getAccountAddress } from "../../utils/getAccount"

import { Stargate } from "../Stargate"
import { TokenUtils } from "../../utils/tokens/TokenUtils"
import { zeroAddress } from "viem"

async function main() {
	const sourceChain = arbitrum
	const destinationChainId = fuse.id

	const ETH = zeroAddress
	const USDT_ARB = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
	const USDT_FUSE = "0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7"
	const WETH_FUSE = "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590"

	const tokenInAddress = ETH
	const recipient = getAccountAddress()

	const tokenIn = await TokenUtils.fromAddress(tokenInAddress, sourceChain.id)

	const balance = tokenIn.parseUnits("0.115")
	console.log("Sending:", tokenIn.formatUnits(balance), tokenIn.symbol)

	const bridgeTx = await Stargate.send(
		tokenIn,
		balance,
		recipient,
		destinationChainId,
	)

	console.log("TxHash:", bridgeTx.hash)

	await bridgeTx.waitForBridgeToFinish()

	console.log("\nDstTxHash:", bridgeTx.dstTxHash)
}

main().catch(console.error)
