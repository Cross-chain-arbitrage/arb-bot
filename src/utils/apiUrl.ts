import dotenv from 'dotenv'
import { isValidUrl } from './validation'

dotenv.config()

export function getApiUrl(): string {
	const apiUrl = process.env.STARGATE_API_URL

	if (!apiUrl || !isValidUrl(apiUrl)) {
		throw new Error('STARGATE_API_URL is not a valid URL')
	}

	return apiUrl
}
