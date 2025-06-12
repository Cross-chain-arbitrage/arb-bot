import { Message, MessageStatus } from '@layerzerolabs/scan-client'
import { Hash, isHash, zeroHash } from 'viem'
import { LayerZeroScanAPI } from '../../src/data-apis/layerzeroscan/LayerZeroScanAPI'
import { makeSuite } from '../utils/makeSuite'

makeSuite('LayerZeroScanAPI', () => {
	it('retrieves messages for a given srcTxHash', async () => {
		const srcTxHash =
			'0x2351c2e4875885ecab97b8dbcb34a5fe6f9dc8614c2c36de05f0898352b0709d'

		const messages =
			await LayerZeroScanAPI.getMessagesBySrcTxHash(srcTxHash)

		console.log(messages)

		expect(messages.length).toBeGreaterThan(0)
	})

	it('MUST return empty array for non existent srcTxHash', async () => {
		const nonExistentTxHash =
			'0x0000000000000000000000000000000000000000000000000000000000000001'
		const messages =
			await LayerZeroScanAPI.getMessagesBySrcTxHash(nonExistentTxHash)
		expect(messages.length).toBe(0)
	})

	it('MUST throw if srcTxHash is zero hash', async () => {
		await expect(
			LayerZeroScanAPI.getMessagesBySrcTxHash(zeroHash),
		).rejects.toThrow()
	})

	it('MUST wait for message to be delivered', async () => {
		const srcTxHash =
			'0x2351c2e4875885ecab97b8dbcb34a5fe6f9dc8614c2c36de05f0898352b0709d'

		const message = await LayerZeroScanAPI.waitForDeliveryStatus(srcTxHash)

		expect(message.status).toBe(MessageStatus.DELIVERED)
		expect(message.dstTxHash).toBeDefined()
		expect(message.srcTxHash).toBe(srcTxHash)
	})

	it.skip('MUST poll until message is delivered', async () => {
		interface RecentMessages {
			count: number
			messages: Message[]
		}

		const recentMessagesURL =
			'https://layerzeroscan.com/api/trpc/messages.list?input=%7B%22filters%22%3A%7B%22stage%22%3A%22mainnet%22%2C%22created%22%3A%7B%7D%7D%7D'

		const recentMessages = await fetch(recentMessagesURL)
		const recentMessagesData: { result: { data: RecentMessages } } =
			await recentMessages.json()

		const srcTxHash = recentMessagesData.result.data.messages[0].srcTxHash
		console.log(srcTxHash)

		if (!isHash(srcTxHash as Hash)) {
			throw new Error(
				'srcTxHash got from LayerZeroScanAPI is not a valid hash',
			)
		}

		jest.setTimeout(5 * 60_000)

		const message = await LayerZeroScanAPI.waitForDeliveryStatus(
			srcTxHash as Hash,
		)

		expect(message.status).toBe(MessageStatus.DELIVERED)
		expect(message.dstTxHash).toBeDefined()
		expect(message.srcTxHash).toBe(srcTxHash)
	})
})
