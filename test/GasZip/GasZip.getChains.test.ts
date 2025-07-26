import { parseEther } from 'viem'
import { arbitrum, hemi, superposition } from 'viem/chains'
import {
	GasZipBridge,
	GasZipChain,
} from '../../src/bridges/GasZip/GasZipBridge'
import { makeSuite } from '../testUtils/makeSuite'

makeSuite('GasZip ~ getChains()', () => {
	it('MUST return chains', async () => {
		const chains = await GasZipBridge.getChains()
		expect(chains).toBeDefined()
		expect(chains.length).toBeGreaterThan(150)
		expect(
			chains.find((chain) => chain.chain === arbitrum.id),
		).toBeDefined()

		expect(
			chains.find((chain) => chain.chain === superposition.id),
		).toBeDefined()

		expect(chains.find((chain) => chain.chain === hemi.id)).toBeDefined()
	})

	it('MUST return data about chain', async () => {
		const chains = await GasZipBridge.getChains()

		const chain = chains.find(
			(chain) => chain.chain === superposition.id,
		) as GasZipChain

		expect(chain).toBeDefined()

		expect(chain.chain).toBe(superposition.id)
		expect(chain.name).toBe('Superposition')
		expect(chain.short).toBeGreaterThanOrEqual(1)

		// Gas parameters
		expect(Number(chain.gas)).toBeGreaterThan(21000)
		expect(Number(chain.gwei)).toBeGreaterThanOrEqual(10000000)

		// Balance
		expect(Number(chain.bal)).toBeGreaterThan(parseEther('0.001'))

		// RPCs
		expect(chain.rpcs).toBeDefined()
		expect(chain.symbol).toBe('ETH')
		expect(chain.price).toBeGreaterThanOrEqual(2000)
	})
})
