import { arbitrum, fuse } from 'viem/chains'

import { Stargate } from '../../src/bridges/stargate/Stargate'
import { Token } from '../../src/primitives/tokens/Token'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { getAlchemyRpcUrl } from '../../src/utils/alchemy'
import { ClientManager } from '../../src/utils/ClientManager'
import { setNativeBalance, setTokenBalance, useAnvil } from '../testUtils/anvil'
import { makeSuite } from '../testUtils/makeSuite'

makeSuite('Stargate', () => {
	useAnvil({
		chainId: arbitrum.id,
		rpcUrl: getAlchemyRpcUrl(arbitrum.id),
	})

	it('MUST simulate sending Token', async () => {
		const USDT0 = await TokenUtils.fromAddress<Token>(
			'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
			arbitrum.id,
		)

		const amount = USDT0.parseUnits('1')
		// const balanceSlot = 4n
		const wallet = ClientManager.getWalletClient(arbitrum.id)
		const recipient = wallet.account!.address

		for (let i = 0; i < 100; i++) {
			await setTokenBalance(
				recipient,
				USDT0.address,
				BigInt(i),
				amount,
				wallet,
			)
		}

		const bridgeAddr = await Stargate.getBridgeAddress(USDT0)
		await USDT0.approve(bridgeAddr, amount)

		const result = await Stargate.bridge(
			USDT0,
			fuse.id,
			recipient,
			amount,
			true,
		)

		expect(result).toBeDefined()
		expect(result.bridgeTx.srcTx.hash).toBeDefined()
		expect(result.bridgeTx.srcTx.chainId).toBe(arbitrum.id)
	})

	it('MUST simulate sending Native', async () => {
		const native = TokenUtils.getNative(arbitrum.id)

		const amount = native.parseUnits('1')

		const wallet = ClientManager.getWalletClient(arbitrum.id)
		const recipient = wallet.account!.address

		await setNativeBalance(wallet, recipient, amount * 2n)

		const result = await Stargate.bridge(
			native,
			fuse.id,
			recipient,
			amount,
			true,
		)

		expect(result).toBeDefined()
		expect(result.bridgeTx.srcTx.hash).toBeDefined()
		expect(result.bridgeTx.srcTx.chainId).toBe(arbitrum.id)
	})

	describe('getExpectedAmountOut', () => {
		it('MUST return same amount for USDT', async () => {
			const USDT0 = await TokenUtils.fromAddress<Token>(
				'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
				arbitrum.id,
			)

			const amount = USDT0.parseUnits('1')

			const { expectedAmountOut, tokenOut, quote } =
				await Stargate.getExpectedAmountOut(USDT0, amount, fuse.id)

			expect(tokenOut.address).toBe(
				'0x3695Dd1D1D43B794C0B13eb8be8419Eb3ac22bf7',
			)
			expect(tokenOut.chainId).toBe(fuse.id)
			expect(expectedAmountOut).toBe(amount)

			expect(quote).toBeDefined()
			expect(quote.oftFees).toBeUndefined()
		})

		it('MUST return amount with loss precision for ETH', async () => {
			// Real life example:
			// https://layerzeroscan.com/tx/0x758ac28e912dff96b8ad5e27a631b23e28861757d09b384d515f64f9fd59bf87
			const ETH = TokenUtils.getNative(arbitrum.id)

			const amount = 199559617334342520n
			const realAmountOut = 199559000000000000n

			const { expectedAmountOut: calculatedAmountOut } =
				await Stargate.getExpectedAmountOut(ETH, amount, fuse.id)

			expect(calculatedAmountOut).toBe(realAmountOut)
		})
	})
})
