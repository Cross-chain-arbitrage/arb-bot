import { Address, Hash } from "viem"
import { Tx } from "../utils/transactions/Tx"
import { LayerZeroScanAPI } from "../layerzero/LayerZeroScanAPI"

export class BridgeTx extends Tx {
	constructor(
		hash: string,
		chainId: number,
		public readonly bridgeId: string,
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
		const message = await LayerZeroScanAPI.waitForMessageReceived(
			this.chainId,
			this.hash as Hash,
		)

		return message
	}
}
