import { Connection, PublicKey } from '@solana/web3.js'
import { formatUnits, parseUnits } from './helpers'

export class SolanaNative implements BaseToken {
	address = 'address not exist'
	decimals = 9
	symbol = 'SOL'
	name = 'Solana'

	constructor() {}

	get id(): string {
		return 'solana-native'
	}

	toString(): string {
		return `${this.symbol} (Solana)`
	}

	toStringFull(): string {
		return `${this.symbol} (Solana)}`
	}

	formatUnits = formatUnits

	parseUnits = parseUnits

	async balanceOf(address: string): Promise<bigint> {
		const connection = new Connection('https://api.mainnet-beta.solana.com')

		const walletPublicKey = new PublicKey(address)

		const balance = await connection.getBalance(walletPublicKey)

		return BigInt(balance)
	}
}
