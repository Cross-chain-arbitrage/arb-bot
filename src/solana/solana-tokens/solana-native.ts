import { Connection, PublicKey } from '@solana/web3.js'
import { SOLANA_CHAIN_ID } from '../solana-constants'
import { formatUnits, parseUnits } from './solana-tokens-helpers'

export const solanaNativeAddress = 'address-plug'

export class SolanaNative implements Token {
	chainId = SOLANA_CHAIN_ID
	address = solanaNativeAddress
	decimals = 9
	symbol = 'SOL'
	name = 'Solana'

	constructor() {}

	get id(): string {
		return 'solana-native'
	}

	isNative() {
		return true
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
