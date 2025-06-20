import { Message } from '@layerzerolabs/scan-client'

export function mockWaitForBridgeToFinish() {
	return Promise.resolve({
		srcTxHash: '0x1234567890abcdef1234567890abcdef12345678',
		dstTxHash: '0xabcdef1234567890abcdef1234567890abcdef12',
	} as Message)
}
