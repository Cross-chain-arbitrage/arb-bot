import { superposition } from 'viem/chains'
import { GasZipBridge } from '../../src/bridges/GasZip/GasZipBridge'
import { makeSuite } from '../testUtils/makeSuite'

makeSuite('GasZip ~ getBridgeLimit()', () => {
	it('MUST return bridge limit', async () => {
		const limit = await GasZipBridge.getBridgeLimit(superposition.id)
		console.log(limit)
		expect(limit).toBeDefined()
		expect(limit).toBeGreaterThan(0)
	})
})
