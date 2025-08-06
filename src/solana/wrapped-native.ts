import { SolanaToken } from './solana-token'

export const wrappedSolanaNativeAddress =
	'So11111111111111111111111111111111111111112'

export class WrappedSolanaNative extends SolanaToken {
	constructor() {
		super(wrappedSolanaNativeAddress, {
			symbol: 'SOL',
			decimals: 9,
		})
	}
}
