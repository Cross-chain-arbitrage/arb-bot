import { Module } from '@nestjs/common'
import { BALANCE_ORACLE_TOKEN } from '../../core/application/interfaces/balance-oracle'
import { BalanceOracleService } from '../../core/infrastructure/balance-oracle/balance-oracle.service'
import { EvmModule } from '../../core/infrastructure/evm/evm.module'
import { SolanaModule } from '../../core/infrastructure/solana/solana.module'
import { GraphBuilderModule } from '../builder/graph-builder.module'

@Module({
	imports: [GraphBuilderModule, EvmModule, SolanaModule],
	providers: [
		{
			provide: BALANCE_ORACLE_TOKEN,
			useClass: BalanceOracleService,
		},
	],
	exports: [BALANCE_ORACLE_TOKEN],
})
export class BalanceOracleModule {}
