import { Injectable } from '@nestjs/common'
import { ChainIdUtils } from '../../../../../../domain/services/chain-id-utils'
import { ChainId } from '../../../../../../domain/value-objects/chain-id'
import { ChainClientService } from '../../../../../evm/chain-client/chain-client.service'
import { SolanaClientService } from '../../../../../solana/solana-client.service'

@Injectable()
export class SolanaEvmHelper {
	constructor(
		private readonly solanaClientService: SolanaClientService,
		private readonly chainClientService: ChainClientService,
	) {}

	async waitForTxResult(chainId: ChainId, txId: string) {
		const { namespace, reference } = ChainIdUtils.parseId(chainId)

		switch (namespace) {
			case 'eip155':
				return this.chainClientService
					.getClient(Number(reference))
					.waitForTransactionReceipt({
						hash: txId as Hex,
					})

			case 'solana':
				return this.solanaClientService.waitForParsedTransaction(txId)

			default:
				throw new Error(`Unsupported chain id: ${chainId}`)
		}
	}
}
