import { Module } from '@nestjs/common'
import { EvmModule } from '../../../../evm/evm.module'
import { EvmGraphBuildingUtils } from './evm-graph-building.utils'
import { EvmTxCostUtils } from './evm-tx-cost.utils'

@Module({
	imports: [EvmModule],
	providers: [EvmTxCostUtils, EvmGraphBuildingUtils],
	exports: [EvmTxCostUtils, EvmGraphBuildingUtils],
})
export class EvmUtilsModule {}
