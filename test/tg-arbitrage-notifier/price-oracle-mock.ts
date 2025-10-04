import {
	CurrencyState,
	PriceOracle,
} from '../../src/core/application/interfaces/price-oracle'
import { Token } from '../../src/core/domain/entities/token'

export class PriceOracleMock implements PriceOracle {
	getPrice(token: Token): Promise<number> {
		return Promise.resolve(1)
	}

	getPrices(tokens: Token[]): Promise<CurrencyState[]> {
		throw new Error('Method not implemented.')
	}
}
