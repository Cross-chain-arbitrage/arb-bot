import { Module } from '@nestjs/common'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { DexGraphPlugin } from '../dex-graph-plugin'
import { EdgeToPoolRegistryModule } from '../edge-to-pool-registry'

@Module({
	imports: [EvmModule, DexModule, EdgeToPoolRegistryModule],
	providers: [DexGraphPlugin],
	exports: [DexGraphPlugin],
})
export class DexGraphPluginModule {}
