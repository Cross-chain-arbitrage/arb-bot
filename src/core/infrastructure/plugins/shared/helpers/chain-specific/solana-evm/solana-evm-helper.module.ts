import { Module } from '@nestjs/common'
import { EvmModule } from '../../../../../evm/evm.module'
import { SolanaModule } from '../../../../../solana/solana.module'
import { EvmHelperModule } from '../evm/evm-helper.module'
import { SolanaHelperModule } from '../solana/solana-helper.module'
import { SolanaEvmGraphBuildingHelper } from './solana-evm-graph-building-helper'
import { SolanaEvmHelper } from './solana-evm-helper'
import { SolanaEvmTxCostHelper } from './solana-evm-tx-cost-helper'

@Module({
	imports: [SolanaHelperModule, EvmModule, EvmHelperModule, SolanaModule],
	providers: [
		SolanaEvmHelper,
		SolanaEvmTxCostHelper,
		SolanaEvmGraphBuildingHelper,
	],
	exports: [
		SolanaEvmHelper,
		SolanaEvmTxCostHelper,
		SolanaEvmGraphBuildingHelper,
	],
})
export class SolanaEvmHelperModule {}
