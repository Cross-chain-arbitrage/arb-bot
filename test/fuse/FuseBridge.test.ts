import { bsc, fuse, optimism } from "viem/chains"
import { arbitrum } from "viem/chains"
import { FuseBridge } from "../../src/fuse/bridge/FuseBridge"
import { TokenUtils } from "../../src/utils/tokens/TokenUtils"
import { getAccountAddress } from "../../src/utils/getAccount"
import { Token } from "../../src/utils/tokens/Token"
import { zeroHash } from "viem"

export function testFuseBridge() {
	const WBTC_ARB_ADDRESS = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f"
	const WBTC_FUSE_ADDRESS = "0x34009565bfEeFded0F7e774629a745636Bf35E82"

	it("should bridge WBTC from Fuse to Arbitrum", async () => {
		// TODO: pin block 35736370 on fuse
		const WBTC = await TokenUtils.fromAddress<Token>(
			WBTC_FUSE_ADDRESS,
			fuse.id,
		)

		const bridgeTx = await FuseBridge.bridge(
			WBTC,
			arbitrum.id,
			getAccountAddress(),
			WBTC.parseUnits("0.0000001"),
			true,
		)

		expect(bridgeTx.hash).toBe(zeroHash)
		expect(bridgeTx.dstTxHash).toBeUndefined()
		expect(bridgeTx.chainId).toBe(WBTC.chainId)
		expect(bridgeTx.from).toBe(getAccountAddress())
	})

	it("MUST bridge WBTC from Arbitrum to Fuse", async () => {
		// TODO: pin block 336625734 on arbitrum
		const WBTC = await TokenUtils.fromAddress<Token>(
			WBTC_ARB_ADDRESS,
			arbitrum.id,
		)

		const bridgeTx = await FuseBridge.bridge(
			WBTC,
			fuse.id,
			getAccountAddress(),
			WBTC.parseUnits("0.0000001"),
			true,
		)

		expect(bridgeTx.hash).toBe(zeroHash)
		expect(bridgeTx.dstTxHash).toBeUndefined()
		expect(bridgeTx.chainId).toBe(WBTC.chainId)
		expect(bridgeTx.from).toBe(getAccountAddress())
	})

	it("MUST quote bridge fees from Arbitrum to Fuse", async () => {
		const WBTC = await TokenUtils.fromAddress<Token>(
			WBTC_ARB_ADDRESS,
			arbitrum.id,
		)

		const result = await FuseBridge.quote(WBTC, fuse.id)

		expect(result[0]).toBeGreaterThan(0n)
		expect(result[1]).toBeGreaterThanOrEqual(0n)
	})

	it("MUST quote bridge fees from Fuse to Arbitrum", async () => {
		const WBTC = await TokenUtils.fromAddress<Token>(
			WBTC_FUSE_ADDRESS,
			fuse.id,
		)

		const result = await FuseBridge.quote(WBTC, arbitrum.id)

		expect(result[0]).toBeGreaterThan(0n)
		expect(result[1]).toBeGreaterThanOrEqual(0n)
	})

	it("validateChain() MUST throw if an unsupported chain is provided", () => {
		expect(() => FuseBridge.validateChain(1)).toThrow()
		expect(() => FuseBridge.validateChain(1111111)).toThrow()
	})

	it("validateChain() MUST NOT throw if a supported chain is provided", () => {
		expect(() => FuseBridge.validateChain(arbitrum.id)).not.toThrow()
		expect(() => FuseBridge.validateChain(optimism.id)).not.toThrow()
		expect(() => FuseBridge.validateChain(bsc.id)).not.toThrow()
		expect(() => FuseBridge.validateChain(fuse.id)).not.toThrow()
	})
}
