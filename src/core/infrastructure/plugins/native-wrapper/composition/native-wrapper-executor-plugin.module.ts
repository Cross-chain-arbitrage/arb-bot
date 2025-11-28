import { Module } from '@nestjs/common'
import { EvmModule } from '../../../evm/evm.module'
import { EvmHelperModule } from '../../shared/helpers/chain-specific/evm/evm-helper.module'
import { NativeWrapperExecutorPlugin } from '../native-wrapper-executor-plugin'

@Module({
	imports: [EvmModule, EvmHelperModule],
	providers: [NativeWrapperExecutorPlugin],
	exports: [NativeWrapperExecutorPlugin],
})
export class NativeWrapperExecutorPluginModule {}
