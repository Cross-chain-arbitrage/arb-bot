import { Address, Hash } from 'viem'
import { Tx } from '../../utils/transactions/Tx'
import { LayerZeroScanAPI } from '../../data-apis/layerzeroscan/LayerZeroScanAPI'

export class FuseBridgeTx extends Tx {
	dstTxHash?: Hash

	constructor(
		hash: string,
		chainId: number,
		from: Address,
		to: Address,
		value: bigint,
	) {
		super(hash, chainId, from, to, value)
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
