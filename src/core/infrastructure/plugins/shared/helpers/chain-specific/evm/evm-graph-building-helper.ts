import { Injectable } from '@nestjs/common'
import { ChainIdUtils } from '../../../../../../domain/services/chain-id-utils'
import { TokenIdUtils } from '../../../../../../domain/services/token-id-utils'
import { TokenId } from '../../../../../../domain/value-objects/token-id'
import { TokenUtils } from '../../../../../evm/primitives/tokens/TokenUtils'
import { GraphBuildingHelper } from '../../graph-building-helper'

@Injectable()
export class EvmGraphBuildingHelper extends GraphBuildingHelper<TokenId> {
	constructor(readonly tokenUtils: TokenUtils) {
		super()
	}

	async getNode(edgeConstructorNode: TokenId) {
		const { address, chainId } = TokenIdUtils.parseId(edgeConstructorNode)

		const { reference } = ChainIdUtils.parseId(chainId)

		return this.tokenUtils.fromAddress(
			address as `0x${string}`,
			Number(reference),
		)
	}
}
