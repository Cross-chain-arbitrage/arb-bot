import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { runFuncWithDelay } from '../../../utils/polling'
import { BalanceReporter } from '../../application/use-cases/balance-reporter/balance-reporter'

@Injectable()
export class BalanceReporterScheduler implements OnApplicationBootstrap {
	constructor(private readonly balanceReporter: BalanceReporter) {}

	onApplicationBootstrap() {
		void runFuncWithDelay(async () => {
			await this.balanceReporter.reportBalances()
		}, 60000) // TODO: Make it configurable
	}
}
