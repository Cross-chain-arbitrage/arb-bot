import { Global, Inject, Injectable } from '@nestjs/common'
import { Token } from '../../../domain/entities/token'
import { PRICE_ORACLE_TOKEN, PriceOracle } from '../../interfaces/price-oracle'

@Global()
@Injectable()
export class TokenValuator {
	constructor(
		@Inject(PRICE_ORACLE_TOKEN) readonly priceOracle: PriceOracle,
	) {}

	async convertTokenAmount(
		from: Token,
		to: Token,
		amount: bigint,
	): Promise<bigint> {
		const amountUsd = await this.estimateUsdFromTokenAmount(from, amount)

		const amountOfToToken = await this.estimateTokenAmountFromUsd(
			to,
			amountUsd,
		)

		return amountOfToToken
	}

	async estimateTokenAmountFromUsd(
		token: Token,
		usdAmount: number,
	): Promise<bigint> {
		const tokenPrice = await this.priceOracle.getPrice(token)

		const amountFormatted = usdAmount / tokenPrice

		return token.parseUnits(amountFormatted.toString())
	}

	async estimateUsdFromTokenAmount(
		token: Token,
		amount: bigint,
	): Promise<number> {
		const tokenPrice = await this.priceOracle.getPrice(token)

		const amountFormatted = Number(token.formatUnits(amount))

		return amountFormatted * tokenPrice
	}
}
