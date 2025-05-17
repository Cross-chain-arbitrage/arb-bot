import { arbitrum, fuse } from 'viem/chains'
import { Stargate } from '../../src/stargate/Stargate'
import { TokenUtils } from '../../src/utils/tokens/TokenUtils'
import { makeSuite } from '../utils/makeSuite'
import { setTokenBalance, useAnvil } from '../utils/anvil'
import { ClientManager } from '../../src/utils/ClientManager'

makeSuite('Stargate', () => {
	useAnvil(arbitrum.id)

	it.only('MUST simulate sending Token', async () => {
		const token = await TokenUtils.fromAddress(
			'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
			arbitrum.id,
		)

		const amount = token.parseUnits('1')
		const recipient = '0x000000E374a7Eb3A42E6B335C9D0a45F2f6256EB'

		const client = ClientManager.getClient(arbitrum.id)
		await setTokenBalance(recipient, token.address, 4n, amount, client)

		const bridgeTx = await Stargate.send(
			token,
			amount,
			recipient,
			fuse.id,
			true,
		)

		expect(bridgeTx).toBeDefined()
		expect(bridgeTx.hash).toBeDefined()
		expect(bridgeTx.chainId).toBe(arbitrum.id)
		expect(bridgeTx.from).toBe(recipient)
		expect(bridgeTx.to).toBe(recipient)
		expect(bridgeTx.value).toBe(amount)
	})

	it('MUST simulate sending Native', async () => {
		const native = TokenUtils.createNative(arbitrum.id)

		const amount = native.parseUnits('0.000001')
		const recipient = '0x000000E374a7Eb3A42E6B335C9D0a45F2f6256EB'

		const bridgeTx = await Stargate.send(
			native,
			amount,
			recipient,
			fuse.id,
			true,
		)

		expect(bridgeTx).toBeDefined()
		expect(bridgeTx.hash).toBeDefined()
		expect(bridgeTx.chainId).toBe(arbitrum.id)
		expect(bridgeTx.from).toBe(recipient)
		expect(bridgeTx.to).toBe(recipient)
		expect(bridgeTx.value).toBe(amount)
	})
})
