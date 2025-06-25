import { Chain, parseUnits } from 'viem'
import { arbitrum, lightlinkPhoenix } from 'viem/chains'
import { GasPriceOracle } from '../../src/modules/GasPriceOracle/GasPriceOracle'
import { ClientManager } from '../../src/utils/ClientManager'
import { wait } from '../../src/utils/common'
import { makeSuite } from '../testUtils/makeSuite'

makeSuite('GasPriceOracle', () => {
	it('should be Singleton', () => {
		const GasPriceOracleInstance = GasPriceOracle.getInstance()

		expect(GasPriceOracleInstance).toBeDefined()

		const AnotherGasPriceOracleInstance = GasPriceOracle.getInstance()

		expect(AnotherGasPriceOracleInstance).toBe(GasPriceOracleInstance)
	})

	describe('getGasPrice', () => {
		let oracle: GasPriceOracle
		const deviationPercent = 12.5

		beforeAll(() => {
			oracle = GasPriceOracle.getInstance()
		})

		it('MUST get `GasPriceData` for Arbitrum (EIP-1559)', async () => {
			const fees = await oracle.getGasPrice<'eip1559'>(arbitrum.id)

			expect(fees.maxFeePerGas).toBeGreaterThan(parseUnits('0.01', 9))
			expect(fees.maxPriorityFeePerGas).toBeGreaterThanOrEqual(0)
		})

		it('MUST get `GasPriceData` for Lightlink Phoenix (Legacy)', async () => {
			const fees = await oracle.getGasPrice<'legacy'>(lightlinkPhoenix.id)

			expect(fees.gasPrice).toBeGreaterThan(parseUnits('0.01', 9))
		})

		it('MUST multiply `GasPriceData` by multiplier (Legacy)', async () => {
			const chainId = lightlinkPhoenix.id

			oracle.setGasMultiplier(chainId, 1)

			const fees = await oracle.getGasPrice<'legacy'>(chainId)

			oracle.setGasMultiplier(chainId, 2)

			const fees2 = await oracle.getGasPrice<'legacy'>(chainId)

			expect(fees).toBeDefined()
			expect(fees2).toBeDefined()

			expectEqualWithDeviation(
				fees2.gasPrice,
				fees.gasPrice * 2n,
				deviationPercent,
			)
		})

		it('MUST multiply `maxFeePerGas` and `maxPriorityFeePerGas` by multiplier (EIP-1559)', async () => {
			const chainId = arbitrum.id

			oracle.setGasMultiplier(chainId, 1)

			const fees = await oracle.getGasPrice<'eip1559'>(chainId)

			oracle.setGasMultiplier(chainId, 2)

			const fees2 = await oracle.getGasPrice<'eip1559'>(chainId)

			expect(fees).toBeDefined()
			expect(fees2).toBeDefined()

			expectEqualWithDeviation(
				fees2.maxFeePerGas,
				fees.maxFeePerGas * 2n,
				deviationPercent,
			)
			expectEqualWithDeviation(
				fees2.maxPriorityFeePerGas,
				fees.maxPriorityFeePerGas * 2n,
				deviationPercent,
			)
		})

		it('MUST multiply `maxFeePerGas` and `maxPriorityFeePerGas` by multiplier (EIP-1559)', async () => {
			const chainId = arbitrum.id

			oracle.setGasMultiplier(chainId, 1)

			const fees = await oracle.getGasPrice<'eip1559'>(chainId)

			oracle.setGasMultiplier(chainId, 3)

			const fees2 = await oracle.getGasPrice<'eip1559'>(chainId)

			expect(fees).toBeDefined()
			expect(fees2).toBeDefined()

			expectEqualWithDeviation(
				fees2.maxFeePerGas,
				fees.maxFeePerGas * 3n,
				deviationPercent,
			)

			expectEqualWithDeviation(
				fees2.maxPriorityFeePerGas,
				fees.maxPriorityFeePerGas * 3n,
				deviationPercent,
			)
		})

		it('MUST multiply result of `estimateFeesPerGas` by multiplier (EIP1559)', async () => {
			const chainId = arbitrum.id

			const client = ClientManager.getClient(chainId)
			const fees = await client.estimateFeesPerGas<Chain, 'eip1559'>({
				type: 'eip1559',
			})

			oracle.setGasMultiplier(chainId, 2)

			const fees2 = await oracle.getGasPrice<'eip1559'>(chainId)

			expect(fees).toBeDefined()
			expect(fees2).toBeDefined()

			expectEqualWithDeviation(
				fees2.maxFeePerGas,
				fees.maxFeePerGas * 2n,
				deviationPercent,
			)

			expectEqualWithDeviation(
				fees2.maxPriorityFeePerGas,
				fees.maxPriorityFeePerGas * 2n,
				deviationPercent,
			)
		})

		it('MUST multiply result of `estimateFeesPerGas` by multiplier (Legacy)', async () => {
			const chainId = lightlinkPhoenix.id

			const client = ClientManager.getClient(chainId)
			const fees = await client.estimateFeesPerGas<Chain, 'legacy'>({
				type: 'legacy',
				chain: {
					...client.chain,
					fees: {
						baseFeeMultiplier: () => 1,
					},
				},
			})

			oracle.setGasMultiplier(chainId, 2)

			const fees2 = await oracle.getGasPrice<'legacy'>(chainId)

			expect(fees).toBeDefined()
			expect(fees2).toBeDefined()

			expectEqualWithDeviation(
				fees2.gasPrice,
				fees.gasPrice * 2n,
				deviationPercent,
			)
		})

		describe('Cache', () => {
			it('MUST cache `GasPriceData` for chain requested earlier (EIP-1559)', async () => {
				const fees = await oracle.getGasPrice<'eip1559'>(arbitrum.id)

				await wait(500)

				const fees2 = await oracle.getGasPrice<'eip1559'>(arbitrum.id)

				expect(fees).toMatchObject(fees2)
			})

			it('MUST cache `GasPriceData` for chain requested earlier (Legacy)', async () => {
				const fees = await oracle.getGasPrice<'legacy'>(
					lightlinkPhoenix.id,
				)

				await wait(4000)
				const fees2 = await oracle.getGasPrice<'legacy'>(
					lightlinkPhoenix.id,
				)

				expect(fees).toMatchObject(fees2)
			})

			describe('MUST cache pending request', () => {
				it('MUST cache request for chain requested earlier (EIP-1559)', async () => {
					const fees1 = oracle.getGasPrice<'eip1559'>(arbitrum.id)
					const fees2 = oracle.getGasPrice<'eip1559'>(arbitrum.id)

					const [fees1Result, fees2Result] = await Promise.all([
						fees1,
						fees2,
					])

					expect(fees1Result).toMatchObject(fees2Result)
				})
			})
		})
	})

	function expectEqualWithDeviation(
		received: bigint,
		expected: bigint,
		percent: number,
	) {
		const denominator = BigInt(10000)
		const nominator = BigInt(percent * 100)
		const deviation = (expected * nominator) / denominator
		expect(received).toBeGreaterThan(expected - deviation)
		expect(received).toBeLessThan(expected + deviation)
	}
})
