import { Token } from '../../../domain/entities/token'

export function formatUnits(this: Token, amount: bigint): string {
	let display = amount.toString()

	const negative = display.startsWith('-')
	if (negative) display = display.slice(1)

	display = display.padStart(this.decimals, '0')

	// eslint-disable-next-line prefer-const
	let [integer, fraction] = [
		display.slice(0, display.length - this.decimals),
		display.slice(display.length - this.decimals),
	]
	fraction = fraction.replace(/(0+)$/, '')
	return `${negative ? '-' : ''}${integer || '0'}${
		fraction ? `.${fraction}` : ''
	}`
}

export function parseUnits(this: Token, amount: string | bigint): bigint {
	const value = amount.toString()
	if (!/^(-?)([0-9]*)\.?([0-9]*)$/.test(value))
		throw new Error(`Invalid decimal number: ${value}`)

	let [integer, fraction = '0'] = value.split('.')

	const negative = integer.startsWith('-')
	if (negative) integer = integer.slice(1)

	// trim trailing zeros.
	fraction = fraction.replace(/(0+)$/, '')

	// round off if the fraction is larger than the number of decimals.
	if (this.decimals === 0) {
		if (Math.round(Number(`.${fraction}`)) === 1)
			integer = `${BigInt(integer) + 1n}`
		fraction = ''
	} else if (fraction.length > this.decimals) {
		const [left, unit, right] = [
			fraction.slice(0, this.decimals - 1),
			fraction.slice(this.decimals - 1, this.decimals),
			fraction.slice(this.decimals),
		]

		const rounded = Math.round(Number(`${unit}.${right}`))
		if (rounded > 9)
			fraction = `${BigInt(left) + BigInt(1)}0`.padStart(
				left.length + 1,
				'0',
			)
		else fraction = `${left}${rounded}`

		if (fraction.length > this.decimals) {
			fraction = fraction.slice(1)
			integer = `${BigInt(integer) + 1n}`
		}

		fraction = fraction.slice(0, this.decimals)
	} else {
		fraction = fraction.padEnd(this.decimals, '0')
	}

	return BigInt(`${negative ? '-' : ''}${integer}${fraction}`)
}
