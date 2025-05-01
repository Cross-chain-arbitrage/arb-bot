import axios from 'axios'
import { getApiUrl } from './utils/apiUrl'

export interface StargateRouteParams {
	srcToken: string
	dstToken: string
	srcAddress: string
	dstAddress: string
	srcChainKey: string
	dstChainKey: string
	srcAmount: number
	dstAmountMin: number
}

export interface Route {
	name: string
	mode: 'taxi' | 'bus'
	srcAddress: string
	dstAddress: string
	srcChainKey: string
	dstChainKey: string
	error: string | null
	srcToken: string
	dstToken: string
	srcAmount: string
	srcAmountMax: string
	dstAmount: string
	dstAmountMin: string
	duration: number
	allowance: string
	dstNativeAmount: string
	dstNativeAmountMax?: string
	messageFee: string
	steps: any[] // You might want to define a more specific type for steps if needed
}

export async function getStargateRoutes(
	params: StargateRouteParams,
	mode: 'taxi' | 'bus',
	retry: boolean = false,
): Promise<Route[]> {
	const apiUrl = getApiUrl()

	try {
		const response = await axios.get<{ routes: Route[] }>(
			`${apiUrl}/routes`,
			{ params },
		)

		return response.data.routes
			.map((route: any) => ({
				...route,
				mode: route.mode as 'taxi' | 'bus',
			}))
			.filter((route: Route) => route.mode === mode)
	} catch (error) {
		if (!retry) {
			console.log('Retrying...')
			return await getStargateRoutes(params, mode, true)
		}

		console.error('Error fetching Stargate routes:', error)
		throw error
	}
}
