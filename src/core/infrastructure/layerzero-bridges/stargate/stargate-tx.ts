import { Hash } from 'viem'

import { createCustomError } from '../../../../utils/common'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
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
		super(layerZeroScanService, srcTxHash, srcToken, dstToken, amount)
	}
}
