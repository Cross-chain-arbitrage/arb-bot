import { QuoteEvmSrc } from './schemas/relay-quite-evm-src.schema'
import { QuoteSolanaSrc } from './schemas/relay-quite-solana-src.schema'

export type RawQuote = QuoteSolanaSrc | QuoteEvmSrc

export type Quote<T = RawQuote> = {
	amountOut: bigint
	gasInNative: bigint
	rawResult: T
}

export type DstBridgeResult = {
	amountOut: bigint
	dstTxHash: string
}

export type SrcBridgeResult = {
	srcTxHash: string
	waitForBridge: () => Promise<DstBridgeResult>
}
