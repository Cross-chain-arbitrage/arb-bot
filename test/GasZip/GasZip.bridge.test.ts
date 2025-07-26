import { zeroHash } from 'viem'
import { arbitrum, superposition } from 'viem/chains'
import {
	GAS_ZIP_DIRECT_DEPOSIT_ADDRESS,
	GASZIP_API_URL,
	GasZipBridge,
} from '../../src/bridges/GasZip/GasZipBridge'
import { TokenUtils } from '../../src/primitives/tokens/TokenUtils'
import { ClientManager } from '../../src/utils/ClientManager'
import { setNativeBalance, useAnvil } from '../testUtils/anvil'
import { makeSuite } from '../testUtils/makeSuite'

makeSuite('GasZip ~ bridge()', () => {
	it('MUST bridge Arbitrum -> Superposition', async () => {
		const tokenIn = TokenUtils.getNative(arbitrum.id)
		const tokenOut = TokenUtils.getNative(superposition.id)
		const amount = tokenIn.parseUnits('0.1')

		jest.spyOn(tokenIn, 'balanceOf').mockResolvedValue(amount)

		const bridgeTx = await GasZipBridge.bridge(
			tokenIn,
			tokenOut,
			amount,
			true,
		)

		expect(bridgeTx).toBeDefined()
		expect(bridgeTx.srcTx).toBeDefined()
		expect(bridgeTx.srcTx.chainId).toBe(arbitrum.id)
		expect(bridgeTx.srcTx.hash).toBe(zeroHash)
		expect(bridgeTx.amount).toBe(amount)
	})

	it('MUST call `quote()` to validate params', async () => {
		const tokenIn = TokenUtils.getNative(arbitrum.id)
		const tokenOut = TokenUtils.getNative(superposition.id)
		const amount = tokenIn.parseUnits('0.1')

		const mockQuote = jest.fn()

		jest.spyOn(GasZipBridge, 'quote').mockImplementation(mockQuote)
		jest.spyOn(tokenIn, 'balanceOf').mockResolvedValue(amount)

		await GasZipBridge.bridge(tokenIn, tokenOut, amount, true)

		expect(mockQuote).toHaveBeenCalledWith(tokenIn, tokenOut, amount)
	})

	it('MUST call `fetch()` to get calldata from GasZip API', async () => {
		const tokenIn = TokenUtils.getNative(arbitrum.id)
		const tokenOut = TokenUtils.getNative(superposition.id)
		const amount = tokenIn.parseUnits('0.1')
		const wallet = ClientManager.getWalletClient(arbitrum.id)
		const account = wallet.account.address

		jest.spyOn(tokenIn, 'balanceOf').mockResolvedValue(amount)

		const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					calldata: '0x01012f',
					expires: new Date().getTime() / 1000,
					quotes: [
						{
							chain: tokenOut.chainId,
							decimals: tokenOut.decimals,
							expected: amount,
						},
					],
				}),
		} as Response)

		await GasZipBridge.bridge(tokenIn, tokenOut, amount, true)

		expect(mockFetch).toHaveBeenCalledWith(
			`${GASZIP_API_URL}/quotes/${tokenIn.chainId}/${amount.toString()}/${tokenOut.chainId}?to=${account}&from=${account}`,
		)
	})

	it('MUST THROW if the balance is insufficient', async () => {
		const tokenIn = TokenUtils.getNative(arbitrum.id)
		const tokenOut = TokenUtils.getNative(superposition.id)
		const amount = tokenIn.parseUnits('0.1')

		jest.spyOn(tokenIn, 'balanceOf').mockResolvedValue(amount - 1n)

		await expect(
			GasZipBridge.bridge(tokenIn, tokenOut, amount, true),
		).rejects.toThrow(
			`Insufficient balance of ${tokenIn.toString()} for ${tokenIn.parseUnits(amount)}`,
		)
	})

	it('MUST simulate the bridge operation', async () => {
		const tokenIn = TokenUtils.getNative(arbitrum.id)
		const tokenOut = TokenUtils.getNative(superposition.id)
		const amount = tokenIn.parseUnits('0.1')

		jest.spyOn(tokenIn, 'balanceOf').mockResolvedValue(amount)

		const bridgeTx = await GasZipBridge.bridge(
			tokenIn,
			tokenOut,
			amount,
			true,
		)

		expect(bridgeTx).toBeDefined()
		expect(bridgeTx.srcTx).toBeDefined()
		expect(bridgeTx.srcTx.chainId).toBe(arbitrum.id)
		expect(bridgeTx.srcTx.hash).toBe(zeroHash)
		expect(bridgeTx.amount).toBe(amount)
	})

	describe('MUST send transaction', () => {
		useAnvil({
			chainId: arbitrum.id,
		})

		it('MUST send a transaction with provided calldata', async () => {
			const tokenIn = TokenUtils.getNative(arbitrum.id)
			const tokenOut = TokenUtils.getNative(superposition.id)
			const amount = tokenIn.parseUnits('0.1')

			const client = ClientManager.getClient(arbitrum.id)
			const wallet = ClientManager.getWalletClient(arbitrum.id)

			console.log(client.transport.transports)

			await setNativeBalance(wallet, wallet.account.address, amount * 2n)

			const balanceBefore = await tokenIn.balanceOf(
				wallet.account.address,
			)
			expect(balanceBefore).toBe(amount * 2n)

			const bridgeTx = await GasZipBridge.bridge(
				tokenIn,
				tokenOut,
				amount,
				false,
			)

			expect(bridgeTx).toBeDefined()
			expect(bridgeTx.srcTx).toBeDefined()
			expect(bridgeTx.srcTx.chainId).toBe(arbitrum.id)
			expect(bridgeTx.srcTx.hash).not.toBe(zeroHash)
			expect(bridgeTx.amount).toBe(amount)

			const receipt = await client.waitForTransactionReceipt({
				hash: bridgeTx.srcTx.hash,
			})

			expect(receipt).toBeDefined()
			expect(receipt.status).toBe('success')
			expect(receipt.to).toBe(
				GAS_ZIP_DIRECT_DEPOSIT_ADDRESS.toLowerCase(),
			)

			const balanceAfter = await tokenIn.balanceOf(wallet.account.address)
			const txCost = receipt.gasUsed * receipt.effectiveGasPrice

			expect(balanceAfter).toBe(balanceBefore - amount - txCost)
		})
	})

	// describe('Error Handling', () => {
	// 	beforeEach(() => {
	// 		global.fetch = jest.fn().mockImplementation(() => {
	// 			throw new Error('HTTP Request Error')
	// 		})
	// 	})

	// 	afterEach(() => {
	// 		jest.resetAllMocks()
	// 	})

	// 	it('MUST throw on GasZip API error with Error message', async () => {
	// 		const tokenIn = TokenUtils.getNative(arbitrum.id)
	// 		const tokenOut = TokenUtils.getNative(superposition.id)
	// 		const amount = tokenIn.parseUnits('0.1')

	// 		await expect(
	// 			GasZipBridge.quote(tokenIn, tokenOut, amount),
	// 		).rejects.toThrow('Error: HTTP Request Error')
	// 	})
	// })
})
