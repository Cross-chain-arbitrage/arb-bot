import { Module } from '@nestjs/common'
import { EvmModule } from '../../../evm/evm.module'
import { NativeWrapperGraphPlugin } from '../native-wrapper-graph-plugin'

@Module({
	imports: [EvmModule],
	providers: [NativeWrapperGraphPlugin],
	exports: [NativeWrapperGraphPlugin],
})
export class NativeWrapperGraphPluginModule {}
