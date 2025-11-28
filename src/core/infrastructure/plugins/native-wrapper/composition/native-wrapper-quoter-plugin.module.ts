import { Module } from '@nestjs/common'
import { EvmHelperModule } from '../../shared/helpers/chain-specific/evm/evm-helper.module'
import { NativeWrapperQuoterPlugin } from '../native-wrapper-quoter-plugin'

@Module({
	imports: [EvmHelperModule],
	providers: [NativeWrapperQuoterPlugin],
	exports: [NativeWrapperQuoterPlugin],
})
export class NativeWrapperQuoterPluginModule {}
