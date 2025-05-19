import { Hash } from 'viem'
import { LayerZeroScanAPI } from '../data-apis/layerzeroscan/LayerZeroScanAPI'
import { Tx } from '../utils/transactions/Tx'
import { BridgeTx } from './Bridge'
import { Message } from '@layerzerolabs/scan-client'

export class LZBridgeTx extends Tx implements BridgeTx {
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

	async waitForBridgeToFinish(): Promise<Message> {
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
