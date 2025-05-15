import { arbitrum, fuse } from "viem/chains"
import { getAccountAddress } from "../../../utils/getAccount"

import { FuseBridge } from "../FuseBridge"
import { TokenUtils } from "../../../utils/tokens/TokenUtils"
import { Token } from "../../../utils/tokens/Token"

async function main() {
	const sourceChain = fuse
	const destinationChainId = arbitrum.id

	const WBTC_ARB = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f"
	const WBTC_FUSE = "0x34009565bfEeFded0F7e774629a745636Bf35E82"

	const tokenInAddress = WBTC_FUSE
	const recipient = getAccountAddress()

	const tokenIn = await TokenUtils.fromAddress<Token>(
		tokenInAddress,
		sourceChain.id,
	)

	const balance = (await tokenIn.balanceOf(recipient)) - 10n
	console.log("Sending:", tokenIn.formatUnits(balance), tokenIn.symbol)

	const bridgeTx = await FuseBridge.bridge(
		tokenIn,
		destinationChainId,
		recipient,
		balance,
	)

	console.log("TxHash:", bridgeTx.hash)

	await bridgeTx.waitForBridgeToFinish()

	console.log("\nDstTxHash:", bridgeTx.dstTxHash)
}

main().catch(console.error)
