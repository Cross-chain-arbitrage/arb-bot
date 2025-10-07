import { Message } from '@layerzerolabs/scan-client'
import { Hash } from 'viem'
import { NativeCurrency } from '../evm/primitives/tokens/NativeCurrency'
import { Token } from '../evm/primitives/tokens/Token'
import { Tx } from '../evm/primitives/transactions/transaction'
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
		hash: Hash,
		public readonly srcToken: Token | NativeCurrency,
		public readonly dstToken: Token | NativeCurrency,
		public readonly amount: bigint,
	) {
		this.srcTx = new Tx(hash, srcToken.chainId)
	}

	async waitForBridgeToFinish(): Promise<Message> {
		const message = await this.layerZeroScanService.waitForDeliveryStatus(
			this.srcTx.hash,
		)

		this.dstTx = new Tx(message.dstTxHash as Hash, message.dstChainId)

		return message
	}

	get srcTxHash() {
		return this.srcTx.hash
	}
}
