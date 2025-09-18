export function backoffMs(attempt: number) {
	return Math.min(100 * 2 ** attempt, 30000)
}
