import { Module } from '@nestjs/common'
import { EvmHelperModule } from '../../shared/helpers/chain-specific/evm/evm-helper.module'
import { LifiGraphPlugin } from '../lifi-graph-plugin'

@Module({
	imports: [EvmHelperModule],
	providers: [LifiGraphPlugin],
	exports: [LifiGraphPlugin],
})
export class LifiGraphPluginModule {}
