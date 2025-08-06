import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token'
import { Connection, PublicKey } from '@solana/web3.js'
import { shortenAddress } from '../utils/common'
import { formatUnits, parseUnits } from './helpers'

export class SolanaToken implements BaseToken {
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
		const mintPublicKey = new PublicKey(this.address)
		const walletPublicKey = new PublicKey(address)

		const associatedTokenAccount = await getAssociatedTokenAddress(
			mintPublicKey,
			walletPublicKey,
		)

		const tokenAccount = await getAccount(
			connection,
			associatedTokenAccount,
		)

		const balance = tokenAccount.amount

		return balance
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
