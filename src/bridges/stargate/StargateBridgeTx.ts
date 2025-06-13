import { Hash } from 'viem'
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
		srcChainId: number,
		srcToken: Token | NativeCurrency,
		public readonly dstToken: Token | NativeCurrency,
		amount: bigint,
	) {
		super(srcTxHash, srcChainId, srcToken, amount)
	}

	async getAmountOut() {
		const message = await LayerZeroScanAPI.waitForDeliveryStatus(
			this.hash as Hash,
		)

		if (!message.dstTxHash) {
			throw new StargateBridgeTxError(
				'Destination transaction hash not found',
			)
		}

		const hash = message.dstTxHash as Hash
		const client = ClientManager.getClient(this.chainId)

		const receipt = await client.waitForTransactionReceipt({ hash })

		if (receipt.status !== 'success')
			throw new StargateBridgeTxError(
				`Bridge failed on destination, tx: ${hash}`,
			)

		const transferEvent = receipt.logs
			.map((log) => {
				if (!isSameAddress(log.address, this.token.address)) return null

				const event = decodeEventLog({
					abi: UNIV3_POOL_ABI,
					data: log.data,
					topics: log.topics,
				})

				return event
			})
			.find((event) => event?.eventName === 'Swap')

		if (!swapEvent) throw new UniV3PoolError('Swap event not found')

		const amountOut =
			swapEvent.args.amount0 < 0n
				? -swapEvent.args.amount0
				: -swapEvent.args.amount1

		return { receipt, amountOut }
	}
}
