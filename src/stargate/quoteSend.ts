import { Address, Hex } from "viem"

import { getChainEIdByNativeChainId } from "../layerzero/utils"
import { padAddressToBytes32 } from "../utils/types"

import { STARGATE_BASE_ABI } from "../abi/stargate/stargateBase"
import { ClientManager } from "../utils/ClientManager"

export async function quoteSend(
	token: Address,
	amount: bigint,
	recipient: Address,
	toChainId: number,
	fromChainId: number,
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

	const client = ClientManager.getClient(fromChainId)

	const messagingFee = await client.readContract({
		address: token,
		abi: STARGATE_BASE_ABI,
		functionName: "quoteSend",
		args: [sendParams, payInLZ],
	})

	return messagingFee as MessagingFee
}
