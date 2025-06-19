import { zeroHash } from 'viem'
import {
	arbitrum,
	bsc,
	fuse,
	hemi,
	mainnet,
	optimism,
	sepolia,
} from 'viem/chains'
import { FuseBridge } from '../../src/bridges/FuseBridge/FuseBridge'
import { Token } from '../../src/primitives/tokens/Token'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { getAlchemyRpcUrl } from '../../src/utils/alchemy'
import { ClientManager } from '../../src/utils/ClientManager'
import { getAccountAddress } from '../../src/utils/getAccount'
import { setTokenBalance, useAnvil } from '../utils/anvil'
import { makeSuite } from '../utils/makeSuite'

makeSuite('FuseBridge', () => {
	const WBTC_ARB_ADDRESS = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
	const WBTC_FUSE_ADDRESS = '0x34009565bfEeFded0F7e774629a745636Bf35E82'

	describe('Fuse Chain', () => {
		useAnvil({
			chainId: fuse.id,
		})

		it('MUST quote bridge fees from Fuse to Arbitrum', async () => {
			const WBTC = await TokenUtils.fromAddress<Token>(
				WBTC_FUSE_ADDRESS,
				fuse.id,
			)

			const result = await FuseBridge.quote(WBTC, arbitrum.id)

			expect(result[0]).toBeGreaterThan(0n)
			expect(result[1]).toBeGreaterThanOrEqual(0n)
		})

		it('should bridge WBTC from Fuse to Arbitrum', async () => {
			// TODO: pin block 35736370 on fuse
			const WBTC = await TokenUtils.fromAddress<Token>(
				WBTC_FUSE_ADDRESS,
				fuse.id,
			)

			const amount = WBTC.parseUnits('0.00000001')

			const wallet = ClientManager.getWalletClient(fuse.id)

			await setTokenBalance(
				wallet.account!.address,
				WBTC_FUSE_ADDRESS,
				0n,
				amount,
				wallet,
			)

			const { address: bridgeAddr } = FuseBridge.getBridge(
				WBTC,
				arbitrum.id,
			)

			await WBTC.approve(bridgeAddr, amount)

			const bridgeTx = await FuseBridge.bridge(
				WBTC,
				arbitrum.id,
				getAccountAddress(),
				amount,
				true,
			)

			expect(bridgeTx.hash).toBe(zeroHash)
			expect(bridgeTx.dstTxHash).toBeUndefined()
			expect(bridgeTx.chainId).toBe(WBTC.chainId)
		})
	})

	describe('Arbitrum Chain', () => {
		useAnvil({
			chainId: arbitrum.id,
			rpcUrl: getAlchemyRpcUrl(arbitrum.id),
		})

		it('MUST quote bridge fees from Arbitrum to Fuse', async () => {
			const WBTC = await TokenUtils.fromAddress<Token>(
				WBTC_ARB_ADDRESS,
				arbitrum.id,
			)

			const result = await FuseBridge.quote(WBTC, fuse.id)

			expect(result[0]).toBeGreaterThan(0n)
			expect(result[1]).toBeGreaterThanOrEqual(0n)
		})

		it('MUST bridge WBTC from Arbitrum to Fuse', async () => {
			const WBTC = await TokenUtils.fromAddress<Token>(
				WBTC_ARB_ADDRESS,
				arbitrum.id,
			)

			const amount = WBTC.parseUnits('1')

			const wallet = ClientManager.getWalletClient(arbitrum.id)

			const balanceSlot = 51n

			await setTokenBalance(
				wallet.account!.address,
				WBTC_ARB_ADDRESS,
				balanceSlot,
				amount,
				wallet,
			)

			const { address: bridgeAddr } = FuseBridge.getBridge(WBTC, fuse.id)

			await WBTC.approve(bridgeAddr, amount)

			const bridgeTx = await FuseBridge.bridge(
				WBTC,
				fuse.id,
				wallet.account!.address,
				amount,
				true,
			)

			expect(bridgeTx.hash).toBe(zeroHash)
			expect(bridgeTx.dstTxHash).toBeUndefined()
			expect(bridgeTx.chainId).toBe(WBTC.chainId)
		})
	})

	describe('Bridging Fuse Token', () => {
		describe('From Fuse Chain', () => {
			useAnvil({
				chainId: fuse.id,
				rpcUrl: ClientManager.getCustomRpcUrl(fuse.id),
			})

			it('MUST bridge FUSE to BSC', async () => {
				const FUSE = TokenUtils.getNative(fuse.id)

				const bridgeTx = await FuseBridge.bridge(
					FUSE,
					bsc.id,
					getAccountAddress(),
					FUSE.parseUnits('100'),
					true,
				)

				expect(bridgeTx.hash).toBe(zeroHash)
			})

			it('MUST bridge FUSE to Ethereum', async () => {
				const FUSE = TokenUtils.getNative(fuse.id)

				const bridgeTx = await FuseBridge.bridge(
					FUSE,
					mainnet.id,
					getAccountAddress(),
					FUSE.parseUnits('100'),
					true,
				)

				expect(bridgeTx.hash).toBe(zeroHash)
			})
		})

		describe('From Ethereum Chain', () => {
			useAnvil({
				chainId: mainnet.id,
			})

			it('MUST bridge FUSE', async () => {})
		})

		describe('From BSC Chain', () => {
			useAnvil({
				chainId: bsc.id,
			})

			it('MUST bridge FUSE', async () => {})
		})
	})

	it('validateChain() MUST throw if an unsupported chain is provided', () => {
		expect(() => FuseBridge.validateChain(hemi.id)).toThrow()
		expect(() => FuseBridge.validateChain(sepolia.id)).toThrow()
	})

	it('validateChain() MUST NOT throw if a supported chain is provided', () => {
		expect(() => FuseBridge.validateChain(arbitrum.id)).not.toThrow()
		expect(() => FuseBridge.validateChain(optimism.id)).not.toThrow()
		expect(() => FuseBridge.validateChain(bsc.id)).not.toThrow()
		expect(() => FuseBridge.validateChain(fuse.id)).not.toThrow()
	})
})
