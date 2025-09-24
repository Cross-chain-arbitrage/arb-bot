import { Injectable } from '@nestjs/common'
import { TokenIdUtils } from '../../../../../domain/services/token-id-utils'
import { TokenId } from '../../../../../domain/value-objects/token-id'
import { SolanaTokenUtils } from '../../../../solana/solana-tokens/solana-token-utils'
import { GraphBuildingHelper } from '../../graph-building-helper'

@Injectable()
export class SolanaGraphBuildingHelper extends GraphBuildingHelper<TokenId> {
	constructor(readonly solanaTokenUtils: SolanaTokenUtils) {
		super()
	}

	async getNode(edgeConstructorNode: TokenId) {
		const { address } = TokenIdUtils.parseId(edgeConstructorNode)

		return this.solanaTokenUtils.fromAddress(address)
	}
}
