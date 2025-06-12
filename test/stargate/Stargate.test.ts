import { arbitrum, fuse } from 'viem/chains'

import { Stargate } from '../../src/bridges/stargate/Stargate'
import { Token } from '../../src/primitives/tokens/Token'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { getAlchemyRpcUrl } from '../../src/utils/alchemy'
import { ClientManager } from '../../src/utils/ClientManager'
import { setNativeBalance, setTokenBalance, useAnvil } from '../utils/anvil'
import { makeSuite } from '../utils/makeSuite'

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

		const bridgeTx = await Stargate.bridge(
			USDT0,
			fuse.id,
			recipient,
			amount,
			true,
		)

		expect(bridgeTx).toBeDefined()
		expect(bridgeTx.hash).toBeDefined()
		expect(bridgeTx.chainId).toBe(arbitrum.id)
	})

	it('MUST simulate sending Native', async () => {
		const native = await TokenUtils.getNative(arbitrum.id)

		const amount = native.parseUnits('1')

		const wallet = ClientManager.getWalletClient(arbitrum.id)
		const recipient = wallet.account!.address

		await setNativeBalance(wallet, recipient, amount * 2n)

		const bridgeTx = await Stargate.bridge(
			native,
			fuse.id,
			recipient,
			amount,
			true,
		)

		expect(bridgeTx).toBeDefined()
		expect(bridgeTx.hash).toBeDefined()
		expect(bridgeTx.chainId).toBe(arbitrum.id)
	})
})
