import { Hash } from 'viem'
import { NativeCurrency } from '../../primitives/tokens/NativeCurrency'
import { Token } from '../../primitives/tokens/Token'
import { BridgeTx } from '../BridgeTx'

export class GasZipBridgeTx implements BridgeTx {
	constructor(
		srcTxHash: Hash,
		srcToken: Token | NativeCurrency,
		readonly dstToken: Token | NativeCurrency,
		amount: bigint,
	) {
		super(srcTxHash, srcToken.chainId, srcToken, dstToken, amount)
	}

	async waitForTransaction() {
		// const tx = await this.tokenIn.chain.waitForTransaction(this.txHash)
		// return tx
	}
}
