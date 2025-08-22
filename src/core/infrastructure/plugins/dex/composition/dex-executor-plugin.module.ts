import { Module } from '@nestjs/common'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmPluginHelper } from '../../helpers/evm-plugin-helper'
import { PriceOracleHelper } from '../../helpers/price-oracle-helper'
import { DexExecutorPlugin } from '../dex-executor-plugin'
import { EdgeToPoolRegistryModule } from '../edge-to-pool-registry'

@Module({
	imports: [EvmModule, DexModule, EdgeToPoolRegistryModule],
	providers: [DexExecutorPlugin, EvmPluginHelper, PriceOracleHelper],
	exports: [DexExecutorPlugin],
})
export class DexExecutorPluginModule {}
