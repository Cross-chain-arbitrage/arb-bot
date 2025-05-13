import { waitForMessageReceived } from "@layerzerolabs/scan-client"
import { Hash } from "viem"

export class LayerZeroScanError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, LayerZeroScanError.prototype)
		this.name = "LayerZeroScanError"
	}
}

export class LayerZeroScanAPI {
	private static readonly timeout: number = 10 * 60_000
	private static readonly pollingInterval: number = 2500

	static async waitForMessageReceived(srcChainId: number, srcTxHash: Hash) {
		const timeout = setTimeout(() => {
			throw new LayerZeroScanError(
				`Timeout for message received on chain ${srcChainId} for tx ${srcTxHash}`,
			)
		}, this.timeout)

		const message = await waitForMessageReceived(
			srcChainId,
			srcTxHash,
			this.pollingInterval,
		)

		clearTimeout(timeout)

		return message
	}
}
