import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token'
import { Connection, PublicKey } from '@solana/web3.js'
import { Token, TokenMetadata } from '../../../domain/entities/token'
import { SolanaCurrency } from './solana-currency'

export class SolanaToken extends SolanaCurrency implements Token {
	tokenAccCache = new Map<string, string>()

	constructor(address: string, tokenMetadata: TokenMetadata) {
		super(address, tokenMetadata)
	}

	isNative() {
		return false
	}

	async balanceOf(address: string): Promise<bigint> {
		const connection = new Connection('https://api.mainnet-beta.solana.com')

		const associatedTokenAccount = await this.getTokenAccount(address)

		const tokenAccount = await getAccount(
			connection,
			new PublicKey(associatedTokenAccount),
		)

		const balance = tokenAccount.amount

		return balance
	}

	async getTokenAccount(address: string): Promise<string> {
		if (this.tokenAccCache.has(address.toLowerCase())) {
			return this.tokenAccCache.get(address.toLowerCase())!
		}

		const mintPublicKey = new PublicKey(this.address)
		const walletPublicKey = new PublicKey(address)

		const associatedTokenAccount = await getAssociatedTokenAddress(
			mintPublicKey,
			walletPublicKey,
		)

		this.tokenAccCache.set(
			address.toLowerCase(),
			associatedTokenAccount.toBase58(),
		)

		return associatedTokenAccount.toBase58()
	}
}
