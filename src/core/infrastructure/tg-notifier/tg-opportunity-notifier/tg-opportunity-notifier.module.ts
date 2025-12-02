import { Module } from '@nestjs/common'
import { OPPORTUNITY_NOTIFIER_TOKEN } from '../../../application/interfaces/opportunity-notifier'
import { TgNotifier, THREAD_ID_ENV_NAME } from '../tg-notifier'
import { TgOpportunityNotifier } from './tg-opportunity-notifier'

const tgOpportunityNotifierProvider = {
	provide: OPPORTUNITY_NOTIFIER_TOKEN,
	useClass: TgOpportunityNotifier,
}
@Module({
	imports: [],
	providers: [
		tgOpportunityNotifierProvider,
		{
			provide: THREAD_ID_ENV_NAME,
			useValue: 'TG_OPPORTUNITY_MESSAGE_THREAD_ID',
		},
		TgNotifier,
	],
	exports: [tgOpportunityNotifierProvider],
})
export class TgOpportunityNotifierModule {}
