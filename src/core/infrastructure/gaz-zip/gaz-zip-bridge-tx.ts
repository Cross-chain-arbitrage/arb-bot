import { Hash } from 'viem'
import { ChainClientService } from '../../chain-client/chain-client.service'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { Tx } from '../../primitives/transactions/transaction'
import { createCustomError } from '../../utils/common'
import { poll } from '../../utils/polling'
import { BridgeTx } from '../layerzero-bridges/layerzero-bridge-tx'

export const GasZipBridgeTxError = createCustomError('GasZipBridgeTxError')

interface GasZipDepositResponse {
	deposit: {
		block: number
		chain: number
		hash: Hash
		log: number
		seen: number
		sender: Address
		shorts: number[]
		status: GasZipDepositStatus
		time: number
		to: Address
		type: 'EOA'
		usd: number
		value: string // bigint number in wei
		valueNative: string // bigint number in wei on dst chain
	}
	txs: [
		{
			chain: number
			hash: Hash
			nonce: number
			signer: Address
			status: GasZipDepositStatus
			time: number
			to: Address
			usd: number
			value: string // bigint number in wei
			valueNative: string // bigint number in wei on dst chain
		},
	]
}

enum GasZipDepositStatus {
	SEEN = 'SEEN',
	PENDING = 'PENDING',
	CONFIRMED = 'CONFIRMED',
	PRIORITY = 'PRIORITY',
	CANCELLED = 'CANCELLED',
}

export class GasZipBridgeTx implements BridgeTx {
	public srcTx: Tx
	public dstTx?: Tx
	public amountOut?: bigint

	constructor(
		private readonly chainClientService: ChainClientService,
		srcTxHash: Hash,
		public readonly srcToken: Token | NativeCurrency,
		public readonly dstToken: Token | NativeCurrency,
		public readonly amount: bigint,
		public readonly timeoutMs: number = 60000,
	) {
		if (!srcToken.isNative()) {
			throw new GasZipBridgeTxError('Source token must be native')
		}

		if (!dstToken.isNative()) {
			throw new GasZipBridgeTxError('Destination token must be native')
		}

		if (srcToken.chainId === dstToken.chainId) {
			throw new GasZipBridgeTxError(
				'Source and destination tokens cannot be the same',
			)
		}

		if (amount === 0n) {
			throw new GasZipBridgeTxError('Amount cannot be 0')
		}

		this.srcTx = new Tx(srcTxHash, srcToken.chainId)
	}

	async waitForBridgeToFinish() {
		const getDeposit = async (): Promise<GasZipDepositResponse | null> => {
			const response = await fetch(
				`https://backend.gas.zip/v2/deposit/${this.srcTxHash}`,
			)

			if (!response.ok) {
				return null
			}

			const data = (await response.json()) as GasZipDepositResponse
			return data
		}

		const isDepositConfirmed = (data: GasZipDepositResponse | null) => {
			if (!data?.deposit) {
				return false
			}

			const txs = data.txs

			if (
				txs.length === 1 &&
				txs[0].status === GasZipDepositStatus.CONFIRMED
			) {
				this.dstTx = new Tx(txs[0].hash, this.dstToken.chainId)
				return true
			}

			return false
		}

		const response = await poll<GasZipDepositResponse | null>(
			getDeposit,
			isDepositConfirmed,
			500,
			this.timeoutMs,
			new GasZipBridgeTxError(
				`Polling Timeout on waiting for bridge ${this.srcTxHash} to finish`,
			),
		)

		console.log('response', response)

		if (
			!response ||
			response.txs.length !== 1 ||
			response.txs[0].status !== GasZipDepositStatus.CONFIRMED
		) {
			throw new GasZipBridgeTxError('Deposit not found after polling')
		}

		const client = this.chainClientService.getClient(this.dstToken.chainId)

		const dstTx = await client.getTransaction({
			hash: response.txs[0].hash,
		})

		this.amountOut = dstTx.value
	}

	get srcTxHash() {
		return this.srcTx.hash
	}
}
