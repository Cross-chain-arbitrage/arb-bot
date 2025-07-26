import { Hash } from 'viem'
import { Tx } from '../../../primitives/transactions/transaction'
import { LayerZeroScanService } from '../layerzero-scan/layerzero-scan.service'

export class FuseTx extends Tx {
	dstTxHash?: Hash

	constructor(
		private readonly layerZeroScanService: LayerZeroScanService,
		hash: string,
		chainId: number,
	) {
		super(hash, chainId)
	}

	async waitForBridgeToFinish() {
		const message = await this.layerZeroScanService.waitForDeliveryStatus(
			this.hash as Hash,
		)

		this.dstTxHash = message.dstTxHash! as Hash

		return message
	}

	get srcTxHash() {
		return this.hash
	}
}
