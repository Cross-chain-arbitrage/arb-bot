import {
	Address,
	Client,
	createPublicClient,
	createWalletClient,
	formatEther,
	formatUnits,
	Hex,
	http,
	parseUnits,
	publicActions,
	PublicClient,
	WalletClient,
} from "viem"
import { arbitrum, fuse } from "viem/chains"
import { getStargateType } from "./stargateType"
import { getPathCredits } from "./paths"
import { getAbiByStargateType } from "./getAbiByStargateType"
import { getChainEIdByNativeChainId } from "../layerzero/utils"
import { padAddressToBytes32 } from "../utils/types"
import { Token } from "../utils/token"
import { quote } from "./quote"
import { getStargateTokenMetadata } from "./getStargateTokenMetadata"
import { getChainKey } from "./getChainKey"
import { privateKeyToAccount } from "viem/accounts"
import { getPrivateKey } from "../utils/getPrivateKey"
import { arbUrl, getAlchemyApiKey } from "../utils/alchemy"

// zero address is considered native token by Stargate
async function send(
	token: Token,
	amount: bigint,
	recipient: Address,
	toChainId: number,
	client: PublicClient,
	wallet: WalletClient,
) {
	const metadata = await getStargateTokenMetadata(
		token,
		getChainKey(token.chainId),
	)
	const poolOrOFT = metadata.address as Address
	const stargateType = metadata.stargateType

	if (wallet.chain?.id === toChainId) {
		throw new Error("Cannot sendOft() to the same chain")
	}

	const pathCredits = await getPathCredits(poolOrOFT, toChainId, client)

	if (pathCredits === 0n) {
		throw new Error(
			`No credits for bridging ${poolOrOFT} from ${wallet.chain?.id} to ${toChainId}`,
		)
	}

	const tokenBalance = await token.balanceOf(recipient, client)
	const allowance = await token.allowance(recipient, poolOrOFT, client)

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
	console.log(`From: ${client.chain?.id}`)
	console.log(`To: ${toChainId}`)

	const toChainEId = getChainEIdByNativeChainId(toChainId)
	const recipientBytes32 = padAddressToBytes32(recipient)
	const refundAddress = recipient

	console.log("Path credits:", pathCredits)

	const { messagingFee, oftFees } = await quote(
		poolOrOFT,
		amount,
		recipient,
		toChainId,
		client,
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

	const { request } = await client.simulateContract({
		account: wallet.account,
		address: poolOrOFT,
		abi: getAbiByStargateType(stargateType),
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
	const sourceChain = arbitrum
	const destinationChainId = fuse.id
	const tokenInAddress = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
	const recipient = "0x000000E374a7Eb3A42E6B335C9D0a45F2f6256EB"

	const wallet = createWalletClient({
		account: privateKeyToAccount(getPrivateKey() as `0x${string}`),
		chain: sourceChain,
		transport: http(arbUrl + getAlchemyApiKey()),
	}).extend(publicActions)

	const client = createPublicClient({
		chain: sourceChain,
		transport: http(),
	})

	const tokenIn = await Token.fromAddress(tokenInAddress, client)

	await send(
		tokenIn,
		parseUnits("90", 6),
		recipient,
		destinationChainId,
		client,
		wallet,
	)
}

main().catch(console.error)
