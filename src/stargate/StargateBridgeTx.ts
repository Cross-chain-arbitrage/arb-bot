import { Address, Hash } from "viem"
import { Tx } from "../utils/transactions/Tx"
import { LayerZeroScanAPI } from "../layerzero/LayerZeroScanAPI"

export class StargateBridgeTx extends Tx {
	dstTxHash?: Hash

	constructor(
		hash: string,
		chainId: number,
		from: Address,
		to: Address,
		value: bigint,
		gas: bigint,
		gasPrice: bigint,
		nonce: bigint,
	) {
		super(hash, chainId, from, to, value, gas, gasPrice, nonce)
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
