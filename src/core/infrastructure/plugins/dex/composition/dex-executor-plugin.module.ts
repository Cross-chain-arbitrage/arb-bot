import { Module } from '@nestjs/common'
import { EvmModule } from '../../../evm/evm.module'
import { EvmPluginHelper } from '../../helpers/evm-plugin-helper'
import { PriceOracleHelper } from '../../helpers/price-oracle-helper'
import { DexExecutorPlugin } from '../dex-executor-plugin'

@Module({
	imports: [EvmModule],
	providers: [DexExecutorPlugin, EvmPluginHelper, PriceOracleHelper],
	exports: [DexExecutorPlugin],
})
export class DexExecutorPluginModule {}
