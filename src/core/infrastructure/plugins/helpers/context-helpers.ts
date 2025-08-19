import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { Node } from '../../../domain/entities/node'
import { Token } from '../../../domain/entities/token'

export async function estimateTokenAmountFromUsd(
	this: {
		priceOracle: PriceOracle
	},
	token: Token,
	usdAmount: number,
): Promise<bigint> {
	const tokenPrice = await this.priceOracle.getPrice(token)

	const amountFormatted = usdAmount / tokenPrice

	return token.parseUnits(amountFormatted.toString())
}

export async function estimateUsdFromTokenAmount(
	this: { priceOracle: PriceOracle },
	token: Token,
	amount: bigint,
): Promise<number> {
	const tokenPrice = await this.priceOracle.getPrice(token)

	const amountFormatted = Number(token.formatUnits(amount))

	return amountFormatted * tokenPrice
}

export function generateEdgeId(this: { name: string }, from: Node, to: Node) {
	return `${from.id}-${to.id}-${this.name}`
}
