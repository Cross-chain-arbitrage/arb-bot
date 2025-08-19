import { PriceOracle } from '../../../application/interfaces/price-oracle'
import { Token } from '../../../domain/entities/token'

export async function estimateTokenAmountFromUsd(
	this: {
		priceOracle: PriceOracle
	},
	token: Token,
	usdAmount: number,
) {
	const tokenPrice = await this.priceOracle.getPrice(token)

	const amountFormatted = usdAmount / tokenPrice

	return token.parseUnits(amountFormatted.toString())
}
