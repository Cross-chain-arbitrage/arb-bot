export function calcRate(amountIn: bigint, amountOut: bigint) {
	return -Math.log(Number(amountOut) / Number(amountIn))
}
