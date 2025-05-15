import { wait } from './wait'

export async function poll<T>(
	fn: () => Promise<T>,
	condition: (response: T) => boolean,
	intervalMs: number,
	timeoutMs: number,
	customError?: Error,
): Promise<T> {
	const pollUntilCondition = async (): Promise<T> => {
		let response = await fn()

		while (!condition(response)) {
			await wait(intervalMs)
			response = await fn()
		}

		return response
	}

	let timeoutId: NodeJS.Timeout
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(customError ?? new Error('Polling Timeout'))
		}, timeoutMs)
	})

	try {
		return await Promise.race([pollUntilCondition(), timeoutPromise])
	} finally {
		clearTimeout(timeoutId!)
	}
}
