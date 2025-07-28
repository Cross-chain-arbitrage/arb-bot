/**
 * @dev Struct representing token parameters for the OFT send() operation.
 */
interface SendParams {
	dstEid: number // Destination endpoint ID.
	to: Hex // Recipient address in bytes32 format.
	amountLD: bigint // Amount to send in local decimals.
	minAmountLD: bigint // Minimum amount to send in local decimals.
	extraOptions: Hex // Additional options supplied by the caller to be used in the LayerZero message.
	composeMsg: Hex // The composed message for the send() operation.
	oftCmd: Hex // The OFT command to be executed, unused in default OFT implementations.
}

interface QuoteResult {
	messagingFee: MessagingFee
	oftLimit: OFTLimit
	oftFeeDetails: OFTFeeDetail[]
	oftReceipt: OFTReceipt
}

interface MessagingFee {
	nativeFee: bigint
	lzTokenFee: bigint
}

interface OFTLimit {
	minAmountLD: bigint
	maxAmountLD: bigint
}

interface OFTFeeDetail {
	feeAmountLD: bigint
	description: string
}

interface OFTReceipt {
	amountSentLD: bigint
	amountReceivedLD: bigint
}
