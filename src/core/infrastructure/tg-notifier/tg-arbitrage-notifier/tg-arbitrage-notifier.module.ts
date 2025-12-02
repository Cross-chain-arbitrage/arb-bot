import { Module } from '@nestjs/common'
import { ARBITRAGE_NOTIFIER_TOKEN } from '../../../application/interfaces/arbitrage-notifier'
import { TgNotifier, THREAD_ID_ENV_NAME } from '../tg-notifier'
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
			provide: THREAD_ID_ENV_NAME,
			useValue: 'TG_BOT_MESSAGE_THREAD_ID',
		},
		TgNotifier,
	],
	exports: [tgArbitrageNotifierProvider],
})
export class TgArbitrageNotifierModule {}
