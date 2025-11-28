import { Module } from '@nestjs/common'
import { BalanceReporter } from '../../core/application/use-cases/balance-reporter/balance-reporter'
import { TgBalanceNotifierModule } from '../../core/infrastructure/tg-notifier/tg-balance-notifier/tg-balance-notifier.module'
import { BalanceReporterScheduler } from '../../core/presentation/balance-reporter-scheduler.ts/balance-reporter-scheduler'
import { BalanceOracleModule } from '../balance-oracle/balance-oracle.module'
import { GraphBuilderModule } from '../graph-builder/graph-builder.module'

@Module({
	imports: [BalanceOracleModule, TgBalanceNotifierModule, GraphBuilderModule],
	providers: [BalanceReporter, BalanceReporterScheduler],
})
export class BalanceReporterModule {}
