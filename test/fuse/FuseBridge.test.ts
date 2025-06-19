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
import { setTokenBalance, useAnvil } from '../testUtils/anvil'
import { makeSuite } from '../testUtils/makeSuite'

makeSuite('FuseBridge', () => {
	const WBTC_ARB_ADDRESS = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f'
	const WBTC_FUSE_ADDRESS = '0x34009565bfeefded0f7e774629a745636bf35e82'

	describe('Fuse Chain', () => {
		useAnvil({
			chainId: fuse.id,
			// rpcUrl: ClientManager.getCustomRpcUrl(fuse.id),
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
			const FUSE = TokenUtils.getNative(fuse.id)

			useAnvil({
				chainId: fuse.id,
				// rpcUrl: ClientManager.getCustomRpcUrl(fuse.id),
				timeoutStartAnvil: 15000,
			})

			// beforeEach(async () => {
			// 	await setNativeBalance(
			// 		ClientManager.getWalletClient(fuse.id),
			// 		getAccountAddress(),
			// 		FUSE.parseUnits('100'),
			// 	)
			// })

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
				rpcUrl: getAlchemyRpcUrl(mainnet.id),
			})

			it('MUST bridge FUSE', async () => {
				const wallet = ClientManager.getWalletClient(mainnet.id)

				const FUSE = await TokenUtils.fromAddress<Token>(
					'0x970B9bB2C0444F5E81e9d0eFb84C8ccdcdcAf84d',
					mainnet.id,
				)

				const amount = FUSE.parseUnits('100')

				await setTokenBalance(
					wallet.account!.address,
					FUSE.address,
					0n,
					amount,
					wallet,
				)

				const { address: bridgeAddr } = FuseBridge.getBridge(
					FUSE,
					fuse.id,
				)

				await FUSE.approve(bridgeAddr, amount)

				const bridgeTx = await FuseBridge.bridge(
					FUSE,
					fuse.id,
					getAccountAddress(),
					FUSE.parseUnits('100'),
					true,
				)

				expect(bridgeTx.hash).toBe(zeroHash)
			})
		})

		describe('From BSC Chain', () => {
			useAnvil({
				chainId: bsc.id,
				rpcUrl: getAlchemyRpcUrl(bsc.id),
				timeoutStartAnvil: 10000,
			})

			it('MUST bridge FUSE', async () => {
				const wallet = ClientManager.getWalletClient(bsc.id)

				const FUSE = await TokenUtils.fromAddress<Token>(
					'0x5857c96dae9cf8511b08cb07f85753c472d36ea3',
					bsc.id,
				)

				const amount = FUSE.parseUnits('100')

				for (let i = 0; i < 100; i++) {
					await setTokenBalance(
						wallet.account!.address,
						FUSE.address,
						BigInt(i),
						amount,
						wallet,
					)
				}

				const { address: bridgeAddr } = FuseBridge.getBridge(
					FUSE,
					fuse.id,
				)

				await FUSE.approve(bridgeAddr, amount)

				const bridgeTx = await FuseBridge.bridge(
					FUSE,
					fuse.id,
					getAccountAddress(),
					amount,
					true,
				)

				expect(bridgeTx.hash).toBe(zeroHash)
			})
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
