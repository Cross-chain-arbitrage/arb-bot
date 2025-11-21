import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OnTypedEvent } from '../../../events/event-decorator'
import {
	OPPORTUNITY_NOTIFIER_TOKEN,
	OpportunityNotifier,
} from '../../../interfaces/opportunity-notifier'
import { ArbitrageOpportunity } from '../snapshot-opportunity-finder/types'
import { OpportunityReporterConfig } from './types'

export const OPPORTUNITY_REPORTER_CONFIG_KEY = 'opportunityReporter'

@Injectable()
export class OpportunityReporter {
	minProfitToReport: number

	constructor(
		@Inject(OPPORTUNITY_NOTIFIER_TOKEN)
		private readonly opportunityNotifier: OpportunityNotifier,

		configService: ConfigService,
	) {
		const config = configService.getOrThrow<OpportunityReporterConfig>(
			OPPORTUNITY_REPORTER_CONFIG_KEY,
		)

		this.minProfitToReport = config.minProfitToReport
	}

	@OnTypedEvent('opportunityFound')
	reportOpportunity(opportunity: ArbitrageOpportunity) {
		if (opportunity.profitInUsd > this.minProfitToReport)
			this.opportunityNotifier.notifyOpportunity(opportunity)
	}
}
