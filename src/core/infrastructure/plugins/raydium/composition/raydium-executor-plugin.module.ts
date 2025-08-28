import { Module } from '@nestjs/common'
import { RaydiumModule } from '../../../raydium/raydium.module'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaUtilsModule } from '../../shared-utils/chain-specific/solana/solana-utils.module'
import { PriceOracleHelper } from '../../shared-utils/price-oracle-helper'
import { RaydiumExecutorPlugin } from '../raydium-executor-plugin'

@Module({
	imports: [RaydiumModule, SolanaModule, SolanaUtilsModule],
	providers: [RaydiumExecutorPlugin, PriceOracleHelper],
	exports: [RaydiumExecutorPlugin],
})
export class RaydiumExecutorPluginModule {}
