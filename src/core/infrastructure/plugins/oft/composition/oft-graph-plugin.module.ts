import { Module } from '@nestjs/common'
import { EvmHelperModule } from '../../shared-helpers/chain-specific/evm/evm-helper.module'
import { OftGraphPlugin } from '../oft-graph-plugin'

@Module({
	imports: [EvmHelperModule],
	providers: [OftGraphPlugin],
	exports: [OftGraphPlugin],
})
export class OftGraphPluginModule {}
