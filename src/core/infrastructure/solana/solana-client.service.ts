import { base58 } from '@metaplex-foundation/umi/serializers'
import { Injectable, OnModuleInit } from '@nestjs/common'
import {
	Connection,
	Keypair,
	SendOptions,
	VersionedTransaction,
} from '@solana/web3.js'
import { createCustomError, getEnvSafe } from '../../../utils/common'

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

	async sendAndConfirmTx(tx: VersionedTransaction, options?: SendOptions) {
		const txId = await this.connection.sendTransaction(tx, {
			...options,
		})

		const { lastValidBlockHeight, blockhash } =
			await this.connection.getLatestBlockhash()

		const txResult = await this.connection.confirmTransaction(
			{
				blockhash,
				lastValidBlockHeight,
				signature: txId,
			},
			'finalized',
		)

		if (txResult.value.err !== null) {
			throw new SolanaClientServiceError('Transaction reverted', txResult)
		}

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
}
