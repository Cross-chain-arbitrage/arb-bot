import { arbitrum, base, fuse } from "viem/chains"
import { StargateAPI } from "../../src/stargate/StargateAPI"
import { NativeCurrency } from "../../src/utils/tokens/NativeCurrency"
import { TokenUtils } from "../../src/utils/tokens/TokenUtils"

export function stargateApiTest() {
	it("should get tokens metadata", async () => {
		const tokens = await StargateAPI.getTokensMetadata("fuse")
		console.log(tokens)

		expect(tokens.length).toBeGreaterThan(0)
	})

	it("should get token metadata", async () => {
		const token = await StargateAPI.getTokenMetadata(
			new NativeCurrency(arbitrum.id, "ETH", "Ethereum"),
			"arbitrum",
		)
		console.log(token)
	})

	it("MUST throw on unknown native currency", async () => {
		await expect(
			StargateAPI.getTokenMetadata(
				new NativeCurrency(fuse.id, "FUSE", "FUSE"),
				"fuse",
			),
		).rejects.toThrow()
	})

	it("MUST throw on unknown Token", async () => {
		await expect(
			StargateAPI.getTokenMetadata(
				await TokenUtils.fromAddress(
					"0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI
					base.id,
				),
				"base",
			),
		).rejects.toThrow()
	})
}
