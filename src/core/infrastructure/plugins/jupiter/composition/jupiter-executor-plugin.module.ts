import { Module } from '@nestjs/common'
import { TokenValuatorModule } from '../../../../application/use-cases/token-valuator/token-valuator.module'
import { JupiterModule } from '../../../jupiter/jupiter.module'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaHelperModule } from '../../shared-helpers/chain-specific/solana/solana-helper.module'
import { JupiterExecutorPlugin } from '../jupiter-executor-plugin'

@Module({
	imports: [
		TokenValuatorModule,
		JupiterModule,
		SolanaModule,
		SolanaHelperModule,
	],
	providers: [JupiterExecutorPlugin],
	exports: [JupiterExecutorPlugin],
})
export class JupiterExecutorPluginModule {}
