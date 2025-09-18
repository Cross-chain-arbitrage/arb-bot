import { Connection, PublicKey } from '@solana/web3.js'
import { Token } from '../../../domain/entities/token'
import { SolanaCurrency } from './solana-currency'

export const solanaNativeAddress = 'So11111111111111111111111111111111111111111'

export class SolanaNative extends SolanaCurrency implements Token {
	constructor() {
		super(solanaNativeAddress, {
			symbol: 'SOL',
			decimals: 9,
			name: 'Solana',
		})
	}

	isNative() {
		return true
	}

	async balanceOf(address: string): Promise<bigint> {
		const connection = new Connection('https://api.mainnet-beta.solana.com')

		const walletPublicKey = new PublicKey(address)

		const balance = await connection.getBalance(walletPublicKey)

		return BigInt(balance)
	}
}
