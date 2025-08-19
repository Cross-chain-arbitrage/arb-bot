import { Inject, Injectable } from '@nestjs/common'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../../application/interfaces/price-oracle'
import { Token } from '../../../domain/entities/token'

@Injectable()
export class PriceOracleHelper {
	constructor(
		@Inject(PRICE_ORACLE_TOKEN) readonly priceOracle: PriceOracle,
	) {}

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
