import { Injectable } from '@nestjs/common'
import { ChainIdUtils } from '../../../../../domain/services/chain-id-utils'
import { TokenIdUtils } from '../../../../../domain/services/token-id-utils'
import { TokenId } from '../../../../../domain/value-objects/token-id'
import { TokenUtils } from '../../../../evm/primitives/tokens/TokenUtils'
import { SolanaTokenUtils } from '../../../../solana/solana-tokens/solana-token-utils'
import { GraphBuildingHelper } from '../../graph-building-helper'

@Injectable()
export class SolanaEvmGraphBuildingHelper extends GraphBuildingHelper<TokenId> {
	constructor(
		readonly solanaTokenUtils: SolanaTokenUtils,
		readonly tokenUtils: TokenUtils,
	) {
		super()
	}

	async getNode(edgeConstructorNode: TokenId) {
		const { address, chainId } = TokenIdUtils.parseId(edgeConstructorNode)

		const { namespace, reference } = ChainIdUtils.parseId(chainId)

		if (namespace === 'solana') {
			return this.solanaTokenUtils.fromAddress(address)
		}

		return this.tokenUtils.fromAddress(
			address as `0x${string}`,
			Number(reference),
		)
	}
}
