import { Module } from '@nestjs/common'
import { EvmModule } from '../../../evm/evm.module'
import { DexGraphPlugin } from '../dex-graph-plugin'

@Module({
	imports: [EvmModule],
	providers: [DexGraphPlugin],
	exports: [DexGraphPlugin],
})
export class DexGraphPluginModule {}
