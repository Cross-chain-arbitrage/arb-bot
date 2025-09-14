import { Module } from '@nestjs/common'
import { RaydiumModule } from '../../../raydium/raydium.module'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaHelperModule } from '../../shared-helpers/chain-specific/solana/solana-helper.module'
import { PriceOracleHelper } from '../../shared-helpers/price-oracle-helper'
import { RaydiumExecutorPlugin } from '../raydium-executor-plugin'

@Module({
	imports: [RaydiumModule, SolanaModule, SolanaHelperModule],
	providers: [RaydiumExecutorPlugin, PriceOracleHelper],
	exports: [RaydiumExecutorPlugin],
})
export class RaydiumExecutorPluginModule {}
