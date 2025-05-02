import { Address, PublicClient } from "viem"
import { getStargateType } from "./stargateType"
import { quoteSend } from "./quoteSend"
import { quoteOFT } from "./quoteOFT"

interface QuoteResult {
	isOFT: boolean
	messagingFee: MessagingFee
	oftFees?: {
		oftLimit: OFTLimit
		oftFeeDetails: OFTFeeDetail[]
		oftReceipt: OFTReceipt
	}
}

export async function quote(
	poolOrOFT: Address,
	amount: bigint,
	recipient: Address,
	toChainId: number,
	client: PublicClient,
): Promise<QuoteResult> {
	const stargateType = await getStargateType(poolOrOFT, client)

	const messagingFee = await quoteSend(
		poolOrOFT,
		amount,
		recipient,
		toChainId,
		client,
	)

	if (stargateType === 0) {
		return {
			isOFT: false,
			messagingFee,
		}
	} else if (stargateType === 1) {
		const [oftLimit, oftFeeDetails, oftReceipt] = await quoteOFT(
			poolOrOFT,
			amount,
			recipient,
			toChainId,
			client,
		)

		return {
			isOFT: true,
			messagingFee,
			oftFees: {
				oftLimit,
				oftFeeDetails,
				oftReceipt,
			},
		}
	} else {
		throw new Error("Invalid stargate type")
	}
}
