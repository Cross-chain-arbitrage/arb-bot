import { makeSuite } from '../utils/makeSuite'
import { LiFi } from '../../src/lifi/LiFi'
import { RoutesRequest } from '@lifi/sdk'

makeSuite.only('LiFi', () => {
	it('MUST get routes', async () => {
		const lifi = new LiFi()

		const routesRequest: RoutesRequest = {
			fromChainId: 42161, // Arbitrum
			toChainId: 10, // Optimism
			fromTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
			toTokenAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // DAI on Optimism
			fromAmount: '10000000', // 10 USDC
		}

		const routes = await lifi.getRoutes(routesRequest)
		console.log(routes)
	})
})
