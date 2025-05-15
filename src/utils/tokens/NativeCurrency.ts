import { Address } from 'viem'
import { TokenBase } from './TokenBase'
import { NativeCurrencyError } from '../errors/TokenErrors'

export const NATIVE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
export const STARGATE_NATIVE_ADDRESS =
	'0x0000000000000000000000000000000000000000'

export class NativeCurrency extends TokenBase {
	constructor(chainId: number, symbol: string, name: string) {
		super(STARGATE_NATIVE_ADDRESS, chainId, symbol, 18, name)
	}

	validateNativeAddress(address: Address) {
		if (address === NATIVE_ADDRESS || address === STARGATE_NATIVE_ADDRESS)
			return

		throw new NativeCurrencyError(
			`Invalid native currency address, got ${address} expected ${NATIVE_ADDRESS} or ${STARGATE_NATIVE_ADDRESS}`,
		)
	}

	balanceOf(address: Address): Promise<bigint> {
		return this.client.getBalance({
			address,
		})
	}
}
