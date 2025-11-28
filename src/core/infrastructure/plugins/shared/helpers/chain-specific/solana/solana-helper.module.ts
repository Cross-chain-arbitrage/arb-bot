import { Module } from '@nestjs/common'
import { SolanaModule } from '../../../../../solana/solana.module'
import { SolanaGraphBuildingHelper } from './solana-graph-building-helper'
import { SolanaTxCostHelper } from './solana-tx-cost-helper'

@Module({
	imports: [SolanaModule],
	providers: [SolanaTxCostHelper, SolanaGraphBuildingHelper],
	exports: [SolanaTxCostHelper, SolanaGraphBuildingHelper],
})
export class SolanaHelperModule {}
