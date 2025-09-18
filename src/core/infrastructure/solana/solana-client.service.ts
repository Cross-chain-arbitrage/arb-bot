import { base58 } from '@metaplex-foundation/umi/serializers'
import { Injectable, OnModuleInit } from '@nestjs/common'
import {
	Connection,
	Keypair,
	ParsedTransactionWithMeta,
	SendOptions,
	VersionedTransaction,
} from '@solana/web3.js'
import { createCustomError, getEnvSafe } from '../../../utils/common'
import { poll } from '../../../utils/polling'

const SolanaClientServiceError = createCustomError('SolanaClientServiceError')

@Injectable()
export class SolanaClientService implements OnModuleInit {
	connection = new Connection('https://api.mainnet-beta.solana.com')
	keypair!: Keypair
	walletAddress!: string

	constructor() {}

	onModuleInit() {
		const privateKey = getEnvSafe('SOLANA_PRIVATE_KEY')
		const uint8Pk = this.getPrivateKeyUint8Array(privateKey)

		this.keypair = Keypair.fromSecretKey(uint8Pk)
		this.walletAddress = this.keypair.publicKey.toBase58()
	}

	async sendTx(tx: VersionedTransaction, options?: SendOptions) {
		const txId = await this.connection.sendTransaction(tx, {
			...options,
		})

		return txId
	}

	getSignedTx(rawTx: string) {
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
				if (!status.value)
					throw new SolanaClientServiceError(
						`Transaction status for ${txId} not found`,
					)
				return status.value?.confirmationStatus === 'confirmed'
			},
			1000,
			20000,
			new SolanaClientServiceError(
				`Polling Timeout on waiting for transaction ${txId} to be confirmed`,
			),
		)
	}
}
