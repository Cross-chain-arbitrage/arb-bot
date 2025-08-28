import { Module } from '@nestjs/common'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmUtilsModule } from '../../shared-utils/chain-specific/evm/evm-utils.module'
import { DexGraphPlugin } from '../dex-graph-plugin'

@Module({
	imports: [EvmModule, EvmUtilsModule, DexModule],
	providers: [DexGraphPlugin],
	exports: [DexGraphPlugin],
})
export class DexGraphPluginModule {}
