export async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	customError?: Error,
): Promise<T> {
	const timeout = new Promise<T>((_, reject) => {
		setTimeout(
			() =>
				reject(
					customError ??
						new Error(`Operation timed out after ${timeoutMs}ms`),
				),
			timeoutMs,
		)
	})
	return Promise.race([promise, timeout])
}
