import { Message } from '@layerzerolabs/scan-client'
import { Hash } from 'viem'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { Tx } from '../../primitives/transactions/tx'
import { LayerZeroScanService } from './layerzero-scan/layerzero-scan.service'

export interface BridgeTx {
	srcTx: Tx
	dstTx?: Tx
	srcToken: Token | NativeCurrency
	dstToken: Token | NativeCurrency
	amount: bigint
	waitForBridgeToFinish(): Promise<unknown>
}

export class LZBridgeTx implements BridgeTx {
	public srcTx: Tx
	public dstTx?: Tx

	constructor(
		private readonly layerZeroScanService: LayerZeroScanService,
		hash: string,
		chainId: number,
		public readonly srcToken: Token | NativeCurrency,
		public readonly dstToken: Token | NativeCurrency,
		public readonly amount: bigint,
	) {
		this.srcTx = new Tx(hash, chainId)
	}

	async waitForBridgeToFinish(): Promise<Message> {
		const message = await this.layerZeroScanService.waitForDeliveryStatus(
			this.srcTx.hash as Hash,
		)

		this.dstTx = new Tx(message.dstTxHash!, message.dstChainId)

		return message
	}

	get srcTxHash() {
		return this.srcTx.hash
	}
}
