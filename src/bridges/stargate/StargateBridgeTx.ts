import { Hash } from 'viem'
import { LayerZeroScanAPI } from '../../dataApi/layerzeroscan/LayerZeroScanAPI'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { LZBridgeTx } from '../BridgeTx'

export class StargateBridgeTxError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, StargateBridgeTxError.prototype)
		this.name = 'StargateBridgeTxError'
	}
}

export class StargateBridgeTx extends LZBridgeTx {
	constructor(
		layerZeroScanAPI: LayerZeroScanAPI,
		srcTxHash: Hash,
		srcToken: Token | NativeCurrency,
		override readonly dstToken: Token | NativeCurrency,
		amount: bigint,
	) {
		super(
			layerZeroScanAPI,
			srcTxHash,
			srcToken.chainId,
			srcToken,
			dstToken,
			amount,
		)
	}
}
