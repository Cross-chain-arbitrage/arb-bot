import {
	Address,
	ContractFunctionExecutionError,
	ContractFunctionRevertedError,
	Hex,
} from "viem"

import { PublicClient } from "viem"
import { getChainEIdByNativeChainId } from "../layerzero/utils"
import { padAddressToBytes32 } from "../utils/types"
import { getStargateType } from "./stargateType"
import { getAbiByStargateType } from "./getAbiByStargateType"

export async function quoteSend(
	token: Address,
	amount: bigint,
	recipient: Address,
	toChainId: number,
	client: PublicClient,
): Promise<MessagingFee> {
	const stargateType = await getStargateType(token, client)
	const abi = getAbiByStargateType(stargateType)

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
		address: token,
		abi,
		functionName: "quoteSend",
		args: [sendParams, payInLZ],
	})

	return messagingFee as MessagingFee
}
