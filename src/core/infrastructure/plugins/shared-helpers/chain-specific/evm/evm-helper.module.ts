import { Module } from '@nestjs/common'
import { EvmModule } from '../../../../evm/evm.module'
import { EvmGraphBuildingHelper } from './evm-graph-building-helper'
import { EvmTxCostHelper } from './evm-tx-cost-helper'

@Module({
	imports: [EvmModule],
	providers: [EvmTxCostHelper, EvmGraphBuildingHelper],
	exports: [EvmTxCostHelper, EvmGraphBuildingHelper],
})
export class EvmHelperModule {}
