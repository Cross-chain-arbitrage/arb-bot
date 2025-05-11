import { Address } from "viem"
import { quoteSend } from "./quoteSend"
import { quoteOFT } from "./quoteOFT"
import { StargateTokenMetadata } from "./metadata"

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
	metadata: StargateTokenMetadata,
	amount: bigint,
	recipient: Address,
	toChainId: number,
	fromChainId: number,
): Promise<QuoteResult> {
	const messagingFee = await quoteSend(
		metadata.address as Address,
		amount,
		recipient,
		toChainId,
		fromChainId,
	)

	switch (metadata.stargateType) {
		case "POOL":
			return {
				isOFT: false,
				messagingFee,
			}
		case "OFT":
			const [oftLimit, oftFeeDetails, oftReceipt] = await quoteOFT(
				metadata.address as Address,
				amount,
				recipient,
				toChainId,
				fromChainId,
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
		case "NATIVE":
			return {
				isOFT: false,
				messagingFee,
			}
		default:
			throw new Error("Invalid stargate type")
	}
}
