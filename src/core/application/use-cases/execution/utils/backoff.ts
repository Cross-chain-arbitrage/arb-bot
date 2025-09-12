//TODO: consider backoff math function
export function backoffMs(attempt: number) {
	return Math.min(1000 * 2 ** attempt, 30000)
}
