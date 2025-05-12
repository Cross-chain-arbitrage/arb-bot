import { arbitrum, fuse } from "viem/chains"
import { Token } from "../utils/tokens/Token"
import { getAccountAddress } from "../utils/getAccount"
import { ClientManager } from "../utils/ClientManager"
import { Stargate } from "./Stargate"
import { TokenUtils } from "../utils/tokens/TokenUtils"

async function main() {
	const sourceChain = arbitrum
	const destinationChainId = fuse.id

	const USDT_ARB = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
	const USDT_FUSE = "0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7"
	const WETH_FUSE = "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590"

	const tokenInAddress = USDT_ARB
	const recipient = getAccountAddress()

	const wallet = ClientManager.getWalletClient(sourceChain.id)
	const tokenIn = (await TokenUtils.fromAddress(
		tokenInAddress,
		sourceChain.id,
	)) as Token

	const balance = await tokenIn.balanceOf(recipient)
	console.log("Balance:", balance)

	await Stargate.send(tokenIn, balance, recipient, destinationChainId, wallet)
}

main().catch(console.error)
