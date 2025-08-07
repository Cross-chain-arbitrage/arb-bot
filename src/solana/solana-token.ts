import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token'
import { Connection, PublicKey } from '@solana/web3.js'
import { shortenAddress } from '../utils/common'
import { formatUnits, parseUnits } from './helpers'

export class SolanaToken implements BaseToken {
	tokenAccCache = new Map<string, string>()

	symbol: string
	decimals: number
	name?: string

	constructor(
		readonly address: string,
		tokenMetadata: TokenMetadata,
	) {
		this.symbol = tokenMetadata.symbol
		this.decimals = tokenMetadata.decimals
		this.name = tokenMetadata.name
	}

	get id(): string {
		return `solana:${this.address}`
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

	formatUnits = formatUnits
	parseUnits = parseUnits

	toString(): string {
		return `${this.symbol} (Solana)`
	}

	toStringFull(): string {
		return `${this.symbol} ${shortenAddress(this.address)}`
	}
}
