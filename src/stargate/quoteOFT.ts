import { Address } from "viem"

import { PublicClient } from "viem"
import { getChainEIdByNativeChainId } from "../layerzero/utils"
import { padAddressToBytes32 } from "../utils/types"
import { getAbiByStargateType } from "./getAbiByStargateType"
import { getStargateType } from "./stargateType"

export async function quoteOFT(
	token: Address,
	amount: bigint,
	recipient: Address,
	toChainId: number,
	client: PublicClient,
): Promise<[OFTLimit, OFTFeeDetail[], OFTReceipt]> {
	const toChainEId = getChainEIdByNativeChainId(toChainId)
	const recipientBytes32 = padAddressToBytes32(recipient)

	const stargateType = await getStargateType(token, client)
	const abi = getAbiByStargateType(stargateType)

	const result = await client.readContract({
		address: token,
		abi,
		functionName: "quoteOFT",
		args: [
			{
				dstEid: toChainEId,
				to: recipientBytes32,
				amountLD: amount,
				minAmountLD: amount,
				extraOptions: "0x",
				composeMsg: "0x",
				oftCmd: "0x",
			},
		],
	})

	return result as [OFTLimit, OFTFeeDetail[], OFTReceipt]
}
