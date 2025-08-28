import { Injectable } from '@nestjs/common'
import { TokenUtils } from '../../../../evm/primitives/tokens/TokenUtils'
import { GraphBuildingUtils } from '../../graph-building.utils'

@Injectable()
export class EvmGraphBuildingUtils extends GraphBuildingUtils {
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
