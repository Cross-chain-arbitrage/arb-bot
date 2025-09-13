import { Module } from '@nestjs/common'
import { BALANCE_NOTIFIER_TOKEN } from '../../core/application/interfaces/balance-notifier'
import { BALANCE_ORACLE_TOKEN } from '../../core/application/interfaces/balance-oracle'
import { BalanceReporter } from '../../core/application/use-cases/balance-reporter/balance-reporter'
import { BalanceOracleService } from '../../core/infrastructure/balance-oracle/balance-oracle.service'
import { EvmModule } from '../../core/infrastructure/evm/evm.module'
import { SolanaModule } from '../../core/infrastructure/solana/solana.module'
import { TgBalancesNotifier } from '../../core/infrastructure/tg-notifier/tg-balance-notifier'
import { BalanceReporterScheduler } from '../../core/presentation/balance-reporter-scheduler.ts/balance-reporter-scheduler'
import { GraphBuilderModule } from '../builder/graph-builder.module'

@Module({
	imports: [GraphBuilderModule, EvmModule, SolanaModule],
	providers: [
		BalanceReporter,
		BalanceReporterScheduler,
		{
			provide: BALANCE_NOTIFIER_TOKEN,
			useClass: TgBalancesNotifier,
		},
		{
			provide: BALANCE_ORACLE_TOKEN,
			useClass: BalanceOracleService,
		},
	],
})
export class BalanceReporterModule {}
