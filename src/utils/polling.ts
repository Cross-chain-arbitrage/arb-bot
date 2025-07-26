import { wait } from './common'

export async function poll<T>(
	fn: () => Promise<T>,
	condition: (response: T) => boolean,
	intervalMs: number,
	timeoutMs: number,
	customError?: Error,
): Promise<T> {
	let failedWithTimeout = false // to avoid infinite loop in polling even after timeout

	const pollUntilCondition = async (): Promise<T> => {
		let response = await fn()

		while (!condition(response) && !failedWithTimeout) {
			await wait(intervalMs)
			response = await fn()
		}

		return response
	}

	let timeoutId: NodeJS.Timeout

	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			failedWithTimeout = true
			reject(customError ?? new Error('Polling Timeout'))
		}, timeoutMs)
	})

	try {
		return await Promise.race([pollUntilCondition(), timeoutPromise])
	} finally {
		clearTimeout(timeoutId!)
	}
}

export async function runFuncWithDelay(
	fn: () => unknown,
	intervalMs: number,
): Promise<void> {
	await fn()

	while (true) {
		await wait(intervalMs)
		await fn()
	}
}
