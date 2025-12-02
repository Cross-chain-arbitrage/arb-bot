import { Module } from '@nestjs/common'
import { BALANCE_NOTIFIER_TOKEN } from '../../../application/interfaces/balance-notifier'
import { EvmModule } from '../../evm/evm.module'
import { TgNotifier, THREAD_ID_ENV_NAME } from '../tg-notifier'
import { TgBalancesNotifier } from './tg-balance-notifier'

const tgBalancesNotifierProvider = {
	provide: BALANCE_NOTIFIER_TOKEN,
	useClass: TgBalancesNotifier,
}
@Module({
	imports: [EvmModule],
	providers: [
		{
			provide: THREAD_ID_ENV_NAME,
			useValue: 'TG_BALANCE_REPORTER_THREAD_ID',
		},
		TgNotifier,
		tgBalancesNotifierProvider,
	],
	exports: [tgBalancesNotifierProvider],
})
export class TgBalanceNotifierModule {}
