import { Module } from '@nestjs/common'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmHelperModule } from '../../shared-helpers/chain-specific/evm/evm-helper.module'
import { PriceOracleHelper } from '../../shared-helpers/price-oracle-helper'
import { DexExecutorPlugin } from '../dex-executor-plugin'

@Module({
	imports: [EvmModule, EvmHelperModule, DexModule],
	providers: [PriceOracleHelper, DexExecutorPlugin],
	exports: [DexExecutorPlugin],
})
export class DexExecutorPluginModule {}
