import axios, { AxiosInstance } from 'axios'
import { PriceOracle } from '../../src/modules/PriceOracle/PriceOracle'
import { wait } from '../../src/utils/common'
import { makeSuite } from '../utils/makeSuite'

function buildPriceData(price: number): CMCQuotesResponse {
	return {
		data: {
			'1027': { quote: { USD: { price } } },
		},
	}
}

makeSuite('Price Oracle', () => {
	it('should create a price oracle with initialized prices', async () => {
		const priceOracle = await PriceOracle.create()

		console.log(priceOracle.getPrice('ETH'))

		expect(priceOracle.getPrice('ETH')).toBeDefined()

		clearInterval(priceOracle.updateIntervalId)
	})

	it('should update prices with interval', async () => {
		jest.spyOn(axios, 'create').mockReturnValue({
			get: jest
				.fn()
				.mockImplementationOnce(() =>
					Promise.resolve({ data: buildPriceData(2000) }),
				)
				.mockImplementationOnce(() =>
					Promise.resolve({ data: buildPriceData(3001) }),
				),
		} as unknown as AxiosInstance)

		const updateInterval = 10
		const priceOracle = await PriceOracle.create(updateInterval)

		expect(priceOracle.getPrice('ETH')).toBe(2000)

		await wait(15)

		expect(priceOracle.getPrice('ETH')).toBe(3001)

		clearInterval(priceOracle.updateIntervalId)

		jest.restoreAllMocks()
	})
})
