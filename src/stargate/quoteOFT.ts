import { Address } from "viem"

import { PublicClient } from "viem"
import { getChainEIdByNativeChainId } from "../layerzero/utils"
import { padAddressToBytes32 } from "../utils/types"
import { OFT_ABI } from "../abi/stargate/oft"

export async function quoteOFT(
	token: Address,
	amount: bigint,
	recipient: Address,
	toChainId: number,
	client: PublicClient,
): Promise<[OFTLimit, OFTFeeDetail[], OFTReceipt]> {
	const toChainEId = getChainEIdByNativeChainId(toChainId)
	const recipientBytes32 = padAddressToBytes32(recipient)

	const result = await client.readContract({
		address: token as Address,
		abi: OFT_ABI,
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
