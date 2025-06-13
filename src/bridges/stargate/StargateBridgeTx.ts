import { Hash } from 'viem'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
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
}
