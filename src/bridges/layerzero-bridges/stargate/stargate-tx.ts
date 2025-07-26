import { Hash } from 'viem'
import { NativeCurrency } from '../../../primitives/tokens/NativeCurrency'
import { Token } from '../../../primitives/tokens/Token'
import { createCustomError } from '../../../utils/common'
import { LZBridgeTx } from '../layerzero-bridge-tx'
import { LayerZeroScanService } from '../layerzero-scan/layerzero-scan.service'

export const StargateBridgeTxError = createCustomError('StargateBridgeTxError')

export class StargateBridgeTx extends LZBridgeTx {
	constructor(
		layerZeroScanService: LayerZeroScanService,
		srcTxHash: Hash,
		srcToken: Token | NativeCurrency,
		override readonly dstToken: Token | NativeCurrency,
		amount: bigint,
	) {
		super(
			layerZeroScanService,
			srcTxHash,
			srcToken.chainId,
			srcToken,
			dstToken,
			amount,
		)
	}
}
