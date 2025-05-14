import { LayerZeroScanAPI } from "../../src/layerzero/LayerZeroScanAPI"
import { zeroHash } from "viem"

export function layerZeroScanApiTest() {
	it("retrieves messages for a given srcTxHash", async () => {
		const srcTxHash =
			"0x2351c2e4875885ecab97b8dbcb34a5fe6f9dc8614c2c36de05f0898352b0709d"

		const messages =
			await LayerZeroScanAPI.getMessagesBySrcTxHash(srcTxHash)

		console.log(messages)

		expect(messages.length).toBeGreaterThan(0)
	})

	it("MUST return empty array for non existent srcTxHash", async () => {
		const nonExistentTxHash =
			"0x0000000000000000000000000000000000000000000000000000000000000001"
		const messages =
			await LayerZeroScanAPI.getMessagesBySrcTxHash(nonExistentTxHash)
		expect(messages.length).toBe(0)
	})

	it("MUST throw if srcTxHash is zero hash", async () => {
		await expect(
			LayerZeroScanAPI.getMessagesBySrcTxHash(zeroHash),
		).rejects.toThrow()
	})

	// it("MUST wait for message to be received", async () => {
	// 	const srcTxHash =
	// 		"0x2351c2e4875885ecab97b8dbcb34a5fe6f9dc8614c2c36de05f0898352b0709d"

	// 	const message = await LayerZeroScanAPI.waitForMessageReceived(
	// 		arbitrum.id,
	// 		srcTxHash,
	// 	)

	// 	expect(message.srcTxHash).toBe(srcTxHash)
	// })
}
