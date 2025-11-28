import { Module } from '@nestjs/common'
import { DexModule } from '../../../dex/dex.module'
import { EvmModule } from '../../../evm/evm.module'
import { EvmHelperModule } from '../../shared/helpers/chain-specific/evm/evm-helper.module'
import { DexExecutorPlugin } from '../dex-executor-plugin'

@Module({
	imports: [EvmModule, EvmHelperModule, DexModule],
	providers: [DexExecutorPlugin],
	exports: [DexExecutorPlugin],
})
export class DexExecutorPluginModule {}
