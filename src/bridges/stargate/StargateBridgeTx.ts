import { Hash } from 'viem'
import { LZBridgeTx } from '../BridgeTx'
import { NativeCurrency } from '../../utils/tokens/NativeCurrency'
import { Token } from '../../utils/tokens/Token'

export class StargateBridgeTx extends LZBridgeTx {
	constructor(
		srcTxHash: Hash,
		srcChainId: number,
		token: Token | NativeCurrency,
		amount: bigint,
	) {
		super(srcTxHash, srcChainId, token, amount)
	}
}
