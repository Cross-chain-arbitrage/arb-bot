import { Hash } from 'viem'
import { NativeCurrency } from '../../../primitives/tokens/NativeCurrency'
import { Token } from '../../../primitives/tokens/Token'
import { LZBridgeTx } from '../layerzero-bridge-tx'
import { LayerZeroScanService } from '../layerzero-scan/layerzero-scan.service'

export class StargateBridgeTxError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, StargateBridgeTxError.prototype)
		this.name = 'StargateBridgeTxError'
	}
}

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
