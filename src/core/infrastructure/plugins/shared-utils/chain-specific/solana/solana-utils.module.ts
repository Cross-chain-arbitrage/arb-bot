import { Module } from '@nestjs/common'
import { SolanaModule } from '../../../../solana/solana.module'
import { SolanaGraphBuildingUtils } from './solana-graph-building.utils'
import { SolanaTxCostUtils } from './solana-tx-cost.utils'

@Module({
	imports: [SolanaModule],
	providers: [SolanaTxCostUtils, SolanaGraphBuildingUtils],
	exports: [SolanaTxCostUtils, SolanaGraphBuildingUtils],
})
export class SolanaUtilsModule {}
