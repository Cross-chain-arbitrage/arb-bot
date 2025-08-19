export type RelayConfig = {
	edges: {
		from: {
			chainId: number | 'solana'
			address: string
		}
		to: {
			chainId: number | 'solana'
			address: string
		}
	}[]
}
