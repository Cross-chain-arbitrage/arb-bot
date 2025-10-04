import { Module } from '@nestjs/common'
import { getEnvSafe } from '../../../../utils/common'
import { BALANCE_NOTIFIER_TOKEN } from '../../../application/interfaces/balance-notifier'
import { EvmModule } from '../../evm/evm.module'
import { TG_MESSAGE_THREAD_ID_TOKEN, TgNotifier } from '../tg-notifier'
import { TgBalancesNotifier } from './tg-balance-notifier'

const tgBalancesNotifierProvider = {
	provide: BALANCE_NOTIFIER_TOKEN,
	useClass: TgBalancesNotifier,
}
@Module({
	imports: [EvmModule],
	providers: [
		{
			provide: TG_MESSAGE_THREAD_ID_TOKEN,
			useValue: getEnvSafe('TG_BALANCE_REPORTER_THREAD_ID'),
		},
		TgNotifier,
		tgBalancesNotifierProvider,
	],
	exports: [tgBalancesNotifierProvider],
})
export class TgBalanceNotifierModule {}
