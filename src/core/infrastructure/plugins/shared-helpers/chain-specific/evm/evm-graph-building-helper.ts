import { Injectable } from '@nestjs/common'
import { TokenUtils } from '../../../../evm/primitives/tokens/TokenUtils'
import { GraphBuildingHelper } from '../../graph-building-helper'

@Injectable()
export class EvmGraphBuildingHelper extends GraphBuildingHelper {
	constructor(readonly tokenUtils: TokenUtils) {
		super()
	}

	async getNode(nodeConfig: { chainId: number; address: string }) {
		return this.tokenUtils.fromAddress(
			nodeConfig.address as `0x${string}`,
			nodeConfig.chainId,
		)
	}
}
