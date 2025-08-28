import { Injectable } from '@nestjs/common'
import { SolanaTokenUtils } from '../../../../solana/solana-tokens/solana-token-utils'
import { GraphBuildingUtils } from '../../graph-building.utils'

@Injectable()
export class SolanaGraphBuildingUtils extends GraphBuildingUtils {
	constructor(readonly solanaTokenUtils: SolanaTokenUtils) {
		super()
	}

	async getNode(nodeConfig: { address: string }) {
		return this.solanaTokenUtils.fromAddress(nodeConfig.address)
	}
}
