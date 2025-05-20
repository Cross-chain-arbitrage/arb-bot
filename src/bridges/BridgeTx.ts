import { Hash } from 'viem'
import { LayerZeroScanAPI } from '../data-apis/layerzeroscan/LayerZeroScanAPI'
import { Tx } from '../utils/transactions/Tx'
import { BridgeTx } from './Bridge'
import { Message } from '@layerzerolabs/scan-client'
import { NativeCurrency } from '../utils/tokens/NativeCurrency'
import { Token } from '../utils/tokens/Token'

export class LZBridgeTx extends Tx implements BridgeTx {
	public srcTx: Tx
	public dstTx?: Tx

	constructor(
		hash: string,
		chainId: number,
		public readonly token: Token | NativeCurrency,
		public readonly amount: bigint,
	) {
		super(hash, chainId)
		this.srcTx = new Tx(hash, chainId)
	}

	async waitForBridgeToFinish(): Promise<Message> {
		const message = await LayerZeroScanAPI.waitForDeliveryStatus(
			this.hash as Hash,
		)

		this.dstTx = new Tx(message.dstTxHash!, message.dstChainId)

		return message
	}

	get srcTxHash() {
		return this.hash
	}
}
