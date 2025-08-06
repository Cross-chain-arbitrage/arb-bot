import { SolanaToken } from './solana-token'

export class WrappedSolanaNative extends SolanaToken {
	constructor() {
		const address = 'So11111111111111111111111111111111111111112'

		super(address, {
			symbol: 'SOL',
			decimals: 9,
		})
	}
}
