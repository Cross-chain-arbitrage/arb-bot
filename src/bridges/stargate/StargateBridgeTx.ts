import { decodeEventLog, Hash, TransactionReceipt } from 'viem'
import { ERC20_ABI } from '../../abi/erc20'
import { LayerZeroScanAPI } from '../../data-apis/layerzeroscan/LayerZeroScanAPI'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { ClientManager } from '../../utils/ClientManager'
import { isSameAddress } from '../../utils/common'
import { LZBridgeTx } from '../BridgeTx'

export class StargateBridgeTxError extends Error {
	constructor(message: string) {
		super(message)
		Object.setPrototypeOf(this, StargateBridgeTxError.prototype)
		this.name = 'StargateBridgeTxError'
	}
}

export class StargateBridgeTx extends LZBridgeTx {
	constructor(
		srcTxHash: Hash,
		srcToken: Token | NativeCurrency,
		public readonly dstToken: Token | NativeCurrency,
		amount: bigint,
	) {
		super(srcTxHash, srcToken.chainId, srcToken, dstToken, amount)
	}

	async getAmountOut(): Promise<{
		receipt: TransactionReceipt
		amountOut: bigint
	}> {
		const message = await LayerZeroScanAPI.waitForDeliveryStatus(
			this.srcTx.hash as Hash,
		)

		if (!message.dstTxHash) {
			throw new StargateBridgeTxError(
				'Destination transaction hash not found',
			)
		}

		const hash = message.dstTxHash as Hash
		const client = ClientManager.getClient(this.srcTx.chainId)

		const receipt = await client.waitForTransactionReceipt({ hash })

		if (receipt.status !== 'success')
			throw new StargateBridgeTxError(
				`Bridge failed on destination, tx: ${hash}`,
			)

		const transferEvent = receipt.logs
			.map((log) => {
				if (!isSameAddress(log.address, this.dstToken.address))
					return null

				const event = decodeEventLog({
					abi: ERC20_ABI,
					data: log.data,
					topics: log.topics,
				})

				return event
			})
			.find((event) => event?.eventName === 'Transfer')

		if (!transferEvent)
			throw new StargateBridgeTxError('Transfer event not found')

		const amountOut = 0n
		// transferEvent.args < 0n
		// 	? -transferEvent.args.amount0
		// 	: -transferEvent.args.amount1

		return { receipt, amountOut }
	}
}
