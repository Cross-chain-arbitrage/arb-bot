import { Module } from '@nestjs/common'
import { RaydiumModule } from '../../../raydium/raydium.module'
import { SolanaModule } from '../../../solana/solana.module'
import { PriceOracleHelper } from '../../helpers/price-oracle-helper'
import { SolanaPluginHelper } from '../../helpers/solana-plugin-helper'
import { RaydiumExecutorPlugin } from '../raydium-executor-plugin'

@Module({
	imports: [RaydiumModule, SolanaModule],
	providers: [RaydiumExecutorPlugin, SolanaPluginHelper, PriceOracleHelper],
	exports: [RaydiumExecutorPlugin],
})
export class RaydiumExecutorPluginModule {}
