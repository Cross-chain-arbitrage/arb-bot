import { Module } from '@nestjs/common'
import { getEnvSafe } from '../../../../utils/common'
import { ARBITRAGE_NOTIFIER_TOKEN } from '../../../application/interfaces/arbitrage-notifier'
import { TG_MESSAGE_THREAD_ID_TOKEN, TgNotifier } from '../tg-notifier'
import { TgArbitrageNotifier } from './tg-arbitrage-notifier'

const tgArbitrageNotifierProvider = {
	provide: ARBITRAGE_NOTIFIER_TOKEN,
	useClass: TgArbitrageNotifier,
}
@Module({
	imports: [],
	providers: [
		tgArbitrageNotifierProvider,
		{
			provide: TG_MESSAGE_THREAD_ID_TOKEN,
			useValue: getEnvSafe('TG_BOT_MESSAGE_THREAD_ID'),
		},
		TgNotifier,
	],
	exports: [tgArbitrageNotifierProvider],
})
export class TgArbitrageNotifierModule {}
