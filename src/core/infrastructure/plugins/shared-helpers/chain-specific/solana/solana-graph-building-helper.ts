import { Injectable } from '@nestjs/common'
import { SolanaTokenUtils } from '../../../../solana/solana-tokens/solana-token-utils'
import { GraphBuildingHelper } from '../../graph-building-helper'

@Injectable()
export class SolanaGraphBuildingHelper extends GraphBuildingHelper<string> {
	constructor(readonly solanaTokenUtils: SolanaTokenUtils) {
		super()
	}

	async getNode(edgeConstructorNode: string) {
		return this.solanaTokenUtils.fromAddress(edgeConstructorNode)
	}
}
