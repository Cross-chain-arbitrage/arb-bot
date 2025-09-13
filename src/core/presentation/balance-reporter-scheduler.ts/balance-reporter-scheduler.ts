import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { runFuncWithDelay } from '../../../utils/polling'
import { BalanceReporter } from '../../application/use-cases/balance-reporter/balance-reporter'
import { BalanceReporterSchedulerConfig } from './types'

export const BALANCE_REPORTER_SCHEDULER_CONFIG_KEY = 'balanceReporterScheduler'

@Injectable()
export class BalanceReporterScheduler implements OnApplicationBootstrap {
	constructor(
		private readonly balanceReporter: BalanceReporter,
		private readonly configService: ConfigService,
	) {}

	onApplicationBootstrap() {
		const config = this.configService.get<BalanceReporterSchedulerConfig>(
			BALANCE_REPORTER_SCHEDULER_CONFIG_KEY,
		)

		if (!config) {
			throw new Error('Balance reporter scheduler config not found')
		}

		void runFuncWithDelay(async () => {
			await this.balanceReporter.reportBalances()
		}, config.runInterval)
	}
}
