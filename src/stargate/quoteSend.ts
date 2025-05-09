import {
	Address,
	ContractFunctionExecutionError,
	ContractFunctionRevertedError,
	Hex,
} from "viem"

import { PublicClient } from "viem"
import { getChainEIdByNativeChainId } from "../layerzero/utils"
import { padAddressToBytes32 } from "../utils/types"

import { STARGATE_BASE_ABI } from "../abi/stargate/stargateBase"

export async function quoteSend(
	token: Address,
	amount: bigint,
	recipient: Address,
	toChainId: number,
	client: PublicClient,
): Promise<MessagingFee> {
	const toChainEId = getChainEIdByNativeChainId(toChainId)
	const recipientBytes32 = padAddressToBytes32(recipient)

	const payInLZ = false

	const sendParams = {
		dstEid: toChainEId,
		to: recipientBytes32,
		amountLD: amount,
		minAmountLD: amount,
		extraOptions: "0x" as Hex,
		composeMsg: "0x" as Hex,
		oftCmd: "0x" as Hex,
	}

	const messagingFee = await client.readContract({
		address: token as Address,
		abi: STARGATE_BASE_ABI,
		functionName: "quoteSend",
		args: [sendParams, payInLZ],
	})

	return messagingFee as MessagingFee
}
