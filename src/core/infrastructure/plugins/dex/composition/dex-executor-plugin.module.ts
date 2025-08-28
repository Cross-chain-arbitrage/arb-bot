import { Module } from '@nestjs/common'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmUtilsModule } from '../../shared-utils/chain-specific/evm/evm-utils.module'
import { PriceOracleHelper } from '../../shared-utils/price-oracle-helper'
import { DexExecutorPlugin } from '../dex-executor-plugin'

@Module({
	imports: [EvmModule, EvmUtilsModule, DexModule],
	providers: [PriceOracleHelper, DexExecutorPlugin],
	exports: [DexExecutorPlugin],
})
export class DexExecutorPluginModule {}
