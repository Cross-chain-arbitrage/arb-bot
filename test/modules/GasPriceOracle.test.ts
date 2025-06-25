import { parseUnits } from 'viem'
import { arbitrum, bsc, lightlinkPhoenix } from 'viem/chains'
import { GasPriceOracle } from '../../src/modules/GasPriceOracle/GasPriceOracle'
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

		beforeAll(() => {
			oracle = GasPriceOracle.getInstance()
		})

		it('MUST get `GasPriceData` for Arbitrum according to EIP-1559', async () => {
			const fees = await oracle.getGasPrice(arbitrum.id)

			expect(fees).toBeDefined()
			expect(fees.gasPrice).toBeUndefined()
			expect(fees.maxFeePerGas).toBeDefined()
			expect(fees.maxPriorityFeePerGas).toBeDefined()

			expect(fees.maxFeePerGas).toBeGreaterThan(parseUnits('0.01', 9))
			expect(fees.maxPriorityFeePerGas).toBeGreaterThanOrEqual(0)
		})

		it('MUST get `GasPriceData` for Lightlink Phoenix according to legacy tx type', async () => {
			const fees = await oracle.getGasPrice(lightlinkPhoenix.id)

			expect(fees).toBeDefined()
			expect(fees.gasPrice).toBeDefined()
			expect(fees.maxFeePerGas).toBeUndefined()
			expect(fees.maxPriorityFeePerGas).toBeUndefined()

			expect(fees.gasPrice).toBeGreaterThan(parseUnits('0.01', 9))
		})

		it('MUST cache `GasPriceData` for chain requested earlier', async () => {
			const fees = await oracle.getGasPrice(lightlinkPhoenix.id)

			expect(fees).toBeDefined()
			expect(fees.gasPrice).toBeDefined()
			expect(fees.maxFeePerGas).toBeUndefined()
			expect(fees.maxPriorityFeePerGas).toBeUndefined()

			expect(fees.gasPrice).toBeGreaterThan(parseUnits('0.01', 9))
		})

		it('MUST cache `GasPriceData` for requested chain', async () => {
			const fees = await oracle.getGasPrice(lightlinkPhoenix.id)

			expect(fees).toBeDefined()
			expect(fees.gasPrice).toBeDefined()
			expect(fees.maxFeePerGas).toBeUndefined()
			expect(fees.maxPriorityFeePerGas).toBeUndefined()

			expect(fees.gasPrice).toBeGreaterThan(parseUnits('0.01', 9))
		})

		it('MUST multiply `GasPriceData` by multiplier for Legacy tx type', async () => {
			oracle.setGasMultiplier(lightlinkPhoenix.id, 1)

			const fees = await oracle.getGasPrice(lightlinkPhoenix.id)

			oracle.setGasMultiplier(lightlinkPhoenix.id, 2)

			const fees2 = await oracle.getGasPrice(lightlinkPhoenix.id)

			expect(fees).toBeDefined()
			expect(fees2).toBeDefined()

			if (fees.gasPrice === undefined || fees2.gasPrice === undefined)
				throw new Error('Gas price is not defined')

			expect(fees2.gasPrice).toEqual(fees.gasPrice * 2n)
		})

		it('MUST multiply `GasPriceData` by multiplier for EIP-1559 tx type', async () => {
			oracle.setGasMultiplier(bsc.id, 1)

			const fees = await oracle.getGasPrice(bsc.id)

			oracle.setGasMultiplier(bsc.id, 2)

			const fees2 = await oracle.getGasPrice(bsc.id)

			expect(fees).toBeDefined()
			expect(fees2).toBeDefined()

			if (
				fees.maxFeePerGas === undefined ||
				fees2.maxFeePerGas === undefined
			)
				throw new Error('Max fee per gas is not defined')

			expect(fees2.maxFeePerGas).toEqual(fees.maxFeePerGas * 2n)
			expect(fees2.maxPriorityFeePerGas).toEqual(
				fees.maxPriorityFeePerGas * 2n,
			)
		})
	})
})
