import { Module } from '@nestjs/common'
import { LifiModule } from '../../../lifi/lifi.module'
import { EvmHelperModule } from '../../shared/helpers/chain-specific/evm/evm-helper.module'
import { LifiExecutorPlugin } from '../lifi-executor-plugin'

@Module({
	imports: [LifiModule, EvmHelperModule],
	providers: [LifiExecutorPlugin],
	exports: [LifiExecutorPlugin],
})
export class LifiExecutorPluginModule {}
