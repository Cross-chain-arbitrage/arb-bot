import { Module } from '@nestjs/common'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmHelperModule } from '../../shared-helpers/chain-specific/evm/evm-helper.module'
import { DexGraphPlugin } from '../dex-graph-plugin'

@Module({
	imports: [EvmModule, EvmHelperModule, DexModule],
	providers: [DexGraphPlugin],
	exports: [DexGraphPlugin],
})
export class DexGraphPluginModule {}
