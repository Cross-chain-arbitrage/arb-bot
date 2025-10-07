import { Module } from '@nestjs/common'
import { TokenValuatorModule } from '../../../../application/use-cases/token-valuator/token-valuator.module'
import { EvmModule } from '../../../evm/evm.module'
import { OftModule } from '../../../layerzero-bridges/oft/oft.module'
import { EvmHelperModule } from '../../shared-helpers/chain-specific/evm/evm-helper.module'
import { OftExecutorPlugin } from '../oft-executor-plugin'

@Module({
	imports: [TokenValuatorModule, OftModule, EvmModule, EvmHelperModule],
	providers: [OftExecutorPlugin],
	exports: [OftExecutorPlugin],
})
export class OftExecutorPluginModule {}
