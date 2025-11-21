import { Module } from '@nestjs/common'
import { getEnvSafe } from '../../../../utils/common'
import { OPPORTUNITY_NOTIFIER_TOKEN } from '../../../application/interfaces/opportunity-notifier'
import { TG_MESSAGE_THREAD_ID_TOKEN, TgNotifier } from '../tg-notifier'
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
			provide: TG_MESSAGE_THREAD_ID_TOKEN,
			useValue: getEnvSafe('TG_OPPORTUNITY_MESSAGE_THREAD_ID'),
		},
		TgNotifier,
	],
	exports: [tgOpportunityNotifierProvider],
})
export class TgOpportunityNotifierModule {}
