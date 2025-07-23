import {
	createClient,
	Message,
	MessageStatus,
} from '@layerzerolabs/scan-client'
import { Hash, isHash, zeroHash } from 'viem'
import { poll } from '../../utils/polling'

export class LayerZeroScanError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, LayerZeroScanError.prototype)
		this.name = 'LayerZeroScanError'
	}
}

// @layerzerolabs/scan-client wrapper functions doesn't work
// only manual client creation works
export class LayerZeroScanAPI {
	private readonly timeout: number = 10 * 60_000
	private readonly pollingInterval: number = 2500

	// Assumes only one message is sent per tx
	async waitForDeliveryStatus(srcTxHash: Hash) {
		if (!isHash(srcTxHash)) {
			throw new LayerZeroScanError('srcTxHash is not a valid hash')
		}

		const condition = (messages: Message[]) =>
			messages.length >= 1 &&
			messages[0].status === MessageStatus.DELIVERED

		const messages = await poll<Message[]>(
			() => this.getMessagesBySrcTxHash(srcTxHash),
			condition,
			this.pollingInterval,
			this.timeout,
		)

		return messages[0]
	}

	async getMessagesBySrcTxHash(srcTxHash: Hash): Promise<Message[]> {
		if (srcTxHash === zeroHash) {
			throw new LayerZeroScanError('srcTxHash is zero hash')
		}

		const client = createClient('mainnet')

		const response = await client.getMessagesBySrcTxHash(srcTxHash)
		return response.messages
	}
}
