import {
	Address,
	createPublicClient,
	erc20Abi,
	formatEther,
	formatUnits,
	Hex,
	http,
	parseEther,
	parseUnits,
	PublicClient,
} from "viem"
import { arbitrum, bsc, fuse } from "viem/chains"
import { getStargateType } from "./stargateType"
import { quoteSend } from "./quoteSend"
import { getPathCredits } from "./paths"
import { getAbiByStargateType } from "./getAbiByStargateType"
import { getChainEIdByNativeChainId } from "../layerzero/utils"
import { padAddressToBytes32 } from "../utils/types"
import { Token } from "../utils/token"
import { quote } from "./quote"

async function sendOft(
	poolOrOFT: Address,
	amount: bigint,
	recipient: Address,
	toChainId: number,
	client: PublicClient,
) {
	if (client.chain?.id === toChainId) {
		throw new Error("Cannot sendOft() to the same chain")
	}

	const pathCredits = await getPathCredits(poolOrOFT, toChainId, client)

	if (pathCredits === 0n) {
		throw new Error(
			`No credits for bridging ${poolOrOFT} from ${client.chain?.id} to ${toChainId}`,
		)
	}

	const stargateType = await getStargateType(poolOrOFT, client)
	const abi = getAbiByStargateType(stargateType)

	// Check token balance
	const tokenAddress = await client.readContract({
		address: poolOrOFT,
		abi,
		functionName: "token",
	})

	const token = await Token.fromAddress(tokenAddress, client)

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

	const simulateResult = await client.simulateContract({
		address: poolOrOFT,
		account: recipient,
		abi: getAbiByStargateType(stargateType),
		functionName: "send",
		value: messagingFee.nativeFee,
		args: [
			sendParams,
			messagingFee as { nativeFee: bigint; lzTokenFee: bigint },
			refundAddress,
		],
	})

	console.log("\nSuccessful Tx!")
	console.log("Hash:", simulateResult.result[0].guid)
	console.log("Nonce:", simulateResult.result[0].nonce)
}

async function main() {
	const client = createPublicClient({
		chain: fuse,
		transport: http(),
	})

	const FUSE_USDT_OFT = "0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6"
	const USDT_POOL_BSC = "0x138EB30f73BC423c6455C53df6D89CB01d9eBc63"
	const USDT_POOL_ARBITRUM = "0xcE8CcA271Ebc0533920C83d39F417ED6A0abB7D0"
	const recipient = "0x000000E374a7Eb3A42E6B335C9D0a45F2f6256EB"

	await sendOft(
		FUSE_USDT_OFT,
		parseUnits("1", 6),
		recipient,
		arbitrum.id,
		client,
	)
}

main().catch(console.error)
