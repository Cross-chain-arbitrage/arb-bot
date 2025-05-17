import { createConfig, getRoutes, Route, RoutesRequest } from '@lifi/sdk'
import { config } from 'dotenv'

config()

export class LiFi {
	private config

	constructor() {
		this.config = createConfig({
			integrator: 'ProbCrossArb',
			apiKey: process.env.LIFI_API_KEY,
			preloadChains: true,
		})
	}

	async getRoutes(routesRequest: RoutesRequest): Promise<Route[]> {
		const result = await getRoutes(routesRequest)
		return result.routes
	}
}
