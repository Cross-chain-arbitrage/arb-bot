import { Hash } from 'viem'
import { LayerZeroScanAPI } from '../../dataApi/layerzeroscan/LayerZeroScanAPI'
import { Tx } from '../../primitives/transactions/Tx'

export class FuseBridgeTx extends Tx {
	dstTxHash?: Hash

	constructor(hash: string, chainId: number) {
		super(hash, chainId)
	}

	async waitForBridgeToFinish() {
		const message = await LayerZeroScanAPI.waitForDeliveryStatus(
			this.hash as Hash,
		)

		this.dstTxHash = message.dstTxHash! as Hash

		return message
	}

	get srcTxHash() {
		return this.hash
	}
}
