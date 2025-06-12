import { arbitrum, fuse } from 'viem/chains'

import { Stargate } from '../../src/bridges/stargate/Stargate'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { getAlchemyRpcUrl } from '../../src/utils/alchemy'
import { ClientManager } from '../../src/utils/ClientManager'
import { setTokenBalance, useAnvil } from '../utils/anvil'
import { makeSuite } from '../utils/makeSuite'

makeSuite('Stargate', () => {
	useAnvil({
		chainId: arbitrum.id,
		rpcUrl: getAlchemyRpcUrl(arbitrum.id),
	})

	it('MUST simulate sending Token', async () => {
		const token = await TokenUtils.fromAddress(
			'0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
			arbitrum.id,
		)

		const amount = token.parseUnits('1')
		const recipient = '0x000000E374a7Eb3A42E6B335C9D0a45F2f6256EB'

		const client = ClientManager.getClient(arbitrum.id)
		await setTokenBalance(recipient, token.address, 4n, amount, client)

		const bridgeTx = await Stargate.bridge(
			token,
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
		const native = TokenUtils.createNative(arbitrum.id)

		const amount = native.parseUnits('0.000001')
		const recipient = '0x000000E374a7Eb3A42E6B335C9D0a45F2f6256EB'

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
