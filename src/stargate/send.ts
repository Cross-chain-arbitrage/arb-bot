import { Address, formatEther, formatUnits, Hex, WalletClient } from "viem"
import { arbitrum, fuse } from "viem/chains"
import { getPathCredits } from "./paths"
import { getChainEIdByNativeChainId } from "../layerzero/utils"
import { padAddressToBytes32 } from "../utils/types"
import { Token } from "../utils/token"
import { quote } from "./quote"
import { getStargateTokenMetadata } from "./getStargateTokenMetadata"
import { getChainKey } from "./getChainKey"
import { getAccountAddress } from "../utils/getAccount"
import { STARGATE_BASE_ABI } from "../abi/stargate/stargateBase"
import { ClientManager } from "../utils/ClientManager"

// zero address is considered native token by Stargate
async function send(
	token: Token,
	amount: bigint,
	recipient: Address,
	toChainId: number,
	wallet: WalletClient,
) {
	const tokenMetadata = await getStargateTokenMetadata(
		token,
		getChainKey(token.chainId),
	)
	const poolOrOFT = tokenMetadata.address as Address

	if (token.chainId === toChainId) {
		throw new Error("Cannot sendOft() to the same chain")
	}

	const pathCredits = await getPathCredits(
		poolOrOFT,
		toChainId,
		token.chainId,
	)

	if (pathCredits === 0n) {
		throw new Error(
			`No credits for bridging ${poolOrOFT} from ${wallet.chain?.id} to ${toChainId}`,
		)
	}

	const tokenBalance = await token.balanceOf(recipient)
	const allowance = await token.allowance(recipient, poolOrOFT)

	if (tokenBalance < amount) {
		throw new Error(
			`Insufficient balance, needed ${amount}, has ${tokenBalance}`,
		)
	}

	if (allowance < amount) {
		throw new Error(
			`Insufficient allowance, needed ${amount}, has ${allowance}`,
		)
	}

	console.log("Sending", amount, "of", poolOrOFT, "to", recipient)
	console.log(`From: ${wallet.chain?.id}`)
	console.log(`To: ${toChainId}`)

	const toChainEId = getChainEIdByNativeChainId(toChainId)
	const recipientBytes32 = padAddressToBytes32(recipient)
	const refundAddress = recipient

	console.log("Path credits:", pathCredits)

	const { messagingFee, oftFees } = await quote(
		tokenMetadata,
		amount,
		recipient,
		toChainId,
		token.chainId,
	)

	console.log("--------------------------------")
	console.log("Messaging fee:", formatEther(messagingFee.nativeFee))

	if (oftFees) {
		console.log(
			"OFT limits:",
			formatUnits(oftFees.oftLimit.minAmountLD, token.decimals),
			"-",
			formatUnits(oftFees.oftLimit.maxAmountLD, token.decimals),
		)
		console.log("OFT fee details:", oftFees.oftFeeDetails)
		console.log("OFT receipt:", oftFees.oftReceipt)
	}
	console.log("--------------------------------")

	// if OFT, use the min amount from quote
	const minAmountLD = oftFees?.oftLimit.minAmountLD ?? amount

	const sendParams = {
		dstEid: toChainEId,
		to: recipientBytes32,
		amountLD: amount,
		minAmountLD,
		extraOptions: "0x" as Hex,
		composeMsg: "0x" as Hex,
		oftCmd: "0x" as Hex,
	}

	const client = ClientManager.getClient(token.chainId)

	const { request } = await client.simulateContract({
		account: wallet.account,
		address: poolOrOFT,
		abi: STARGATE_BASE_ABI,
		functionName: "send",
		value: messagingFee.nativeFee,
		args: [
			sendParams,
			messagingFee as { nativeFee: bigint; lzTokenFee: bigint },
			refundAddress,
		],
	})

	const txHash = await wallet.writeContract(request)

	console.log("\nSuccessful Tx!")
	console.log("Hash:", txHash)
}

async function main() {
	const sourceChain = fuse
	const destinationChainId = arbitrum.id

	 
	const USDT_ARB = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
	const USDT_FUSE = "0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7"
	 
	const WETH_FUSE = "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590"

	const tokenInAddress = USDT_FUSE
	const recipient = getAccountAddress()

	const wallet = ClientManager.getWalletClient(sourceChain.id)

	const tokenIn = await Token.fromAddress(tokenInAddress, sourceChain.id)

	const balance = await tokenIn.balanceOf(recipient)
	console.log("Balance:", formatEther(balance))

	await send(tokenIn, balance, recipient, destinationChainId, wallet)
}

main().catch(console.error)
