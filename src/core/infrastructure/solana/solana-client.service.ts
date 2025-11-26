import { base58 } from '@metaplex-foundation/umi/serializers'
import { Injectable } from '@nestjs/common'
import {
	Connection,
	Keypair,
	ParsedTransactionWithMeta,
	SendOptions,
	TokenBalance,
	VersionedTransaction,
} from '@solana/web3.js'
import { createCustomError, getEnvSafe } from '../../../utils/common'
import { poll } from '../../../utils/polling'
import { SolanaCurrency } from './solana-tokens/solana-currency'
import { SolanaToken } from './solana-tokens/solana-token'

const SolanaClientServiceError = createCustomError('SolanaClientServiceError')

@Injectable()
export class SolanaClientService {
	connection = new Connection('https://api.mainnet-beta.solana.com')
	keypair!: Keypair
	walletAddress!: string

	constructor() {
		const privateKey = getEnvSafe('SOLANA_PRIVATE_KEY')
		const uint8Pk = this.getPrivateKeyUint8Array(privateKey)

		this.keypair = Keypair.fromSecretKey(uint8Pk)
		this.walletAddress = this.keypair.publicKey.toBase58()
	}

	async sendTx(tx: VersionedTransaction | string, options?: SendOptions) {
		const txToSend =
			typeof tx === 'string' ? this.getSignedTxFromBase64(tx) : tx

		const sendOptions: SendOptions = options
			? options
			: { preflightCommitment: 'confirmed' }

		const txId = await this.connection.sendTransaction(
			txToSend,
			sendOptions,
		)

		return txId
	}

	getSignedTxFromBase64(rawTx: string) {
		const txBuf = Buffer.from(rawTx, 'base64')
		const tx = VersionedTransaction.deserialize(txBuf)

		tx.sign([this.keypair])

		return tx
	}

	private getPrivateKeyUint8Array(privateKey: string) {
		if (this.canBeBase64(privateKey)) {
			const pk = Buffer.from(privateKey, 'base64')

			if (pk.length === 64) return pk
		}

		if (this.canBeBase58(privateKey)) {
			const pk = base58.serialize(privateKey)

			if (pk.length === 64) return pk
		}

		throw new SolanaClientServiceError(
			`Invalid private key, unsuccessfully tried to serialize from base64 and base58`,
		)
	}

	private canBeBase64(str: string): boolean {
		const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
		return base64Regex.test(str) && str.length % 4 === 0
	}

	private canBeBase58(str: string): boolean {
		const base58Regex =
			/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/
		return base58Regex.test(str)
	}

	async waitForParsedTransaction(
		txId: string,
	): Promise<ParsedTransactionWithMeta> {
		await this.waitConfirmation(txId)

		const parsedTx = await this.connection.getParsedTransaction(txId, {
			commitment: 'confirmed',
			maxSupportedTransactionVersion: 0,
		})

		return parsedTx!
	}

	private async waitConfirmation(txId: string) {
		await poll(
			() =>
				this.connection.getSignatureStatus(txId, {
					searchTransactionHistory: true,
				}),
			(status) => {
				if (status.value === null) return false

				const isConfirmed =
					status.value.confirmationStatus === 'confirmed'
				const isFinalized =
					status.value.confirmationStatus === 'finalized'

				return isConfirmed || isFinalized
			},
			1000,
			20000,
			new SolanaClientServiceError(
				`Polling Timeout on waiting for transaction ${txId} to be confirmed`,
			),
		)
	}

	async parseBalanceChange(
		parsedTx: ParsedTransactionWithMeta,
		token: SolanaCurrency,
	): Promise<bigint> {
		const outputTokenAccount =
			token instanceof SolanaToken
				? await token.getTokenAccount(this.walletAddress)
				: this.walletAddress

		const preBalances = parsedTx.meta?.preTokenBalances

		if (!preBalances) {
			throw new Error('Pre token balances not found in tx')
		}

		const preBalance = this.retrieveBalance(
			outputTokenAccount,
			parsedTx,
			preBalances,
		)

		const postBalances = parsedTx.meta?.postTokenBalances

		if (!postBalances) {
			throw new Error('Post token balances not found in tx')
		}

		const postBalance = this.retrieveBalance(
			outputTokenAccount,
			parsedTx,
			postBalances,
		)

		return postBalance - preBalance
	}

	private retrieveBalance(
		tokenAccount: string,
		parsedTx: ParsedTransactionWithMeta,
		txBalances: TokenBalance[],
	): bigint {
		const accountIndex = parsedTx.transaction.message.accountKeys.findIndex(
			(account) => account.pubkey.toBase58() === tokenAccount,
		)

		if (accountIndex === -1) {
			throw new Error('Token account not found in tx')
		}

		const balance = txBalances.find(
			(txBalance) => txBalance.accountIndex === accountIndex,
		)

		if (!balance) {
			throw new Error(
				`Balance with account index ${accountIndex} not found in tx`,
			)
		}

		return BigInt(balance.uiTokenAmount.amount)
	}
}
