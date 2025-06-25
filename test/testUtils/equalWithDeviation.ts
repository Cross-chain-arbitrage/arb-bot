export function equalWithDeviation(
	received: bigint,
	expected: bigint,
	percent: number,
): boolean {
	const diff = received > expected ? received - expected : expected - received
	const tolerance = (expected * BigInt(Math.floor(percent * 100))) / 10000n

	return diff <= tolerance
}
