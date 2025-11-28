import { Module } from '@nestjs/common'
import { TokenValuatorModule } from '../../../../application/use-cases/token-valuator/token-valuator.module'
import { RaydiumModule } from '../../../raydium/raydium.module'
import { SolanaModule } from '../../../solana/solana.module'
import { SolanaHelperModule } from '../../shared/helpers/chain-specific/solana/solana-helper.module'
import { RaydiumExecutorPlugin } from '../raydium-executor-plugin'

@Module({
	imports: [
		TokenValuatorModule,
		RaydiumModule,
		SolanaModule,
		SolanaHelperModule,
	],
	providers: [RaydiumExecutorPlugin],
	exports: [RaydiumExecutorPlugin],
})
export class RaydiumExecutorPluginModule {}
