import { Injectable, Logger } from '@nestjs/common'
import { ValidationResult } from '../opportunity-validator/types'
import { ArbitrageOpportunity } from '../snapshot-opportunity-finder/types'

@Injectable()
export class ArbitrageFinderTelemetry {
	private readonly logger: Logger = new Logger(ArbitrageFinderTelemetry.name)

	constructor() {}

	reportOpportunities(
		opportunities: ArbitrageOpportunity[] | null,
		validationResult: ValidationResult,
	) {
		const opportunitiesLog = opportunities
			? opportunities.map((opportunity) => {
					return {
						startAmount: opportunity.startAmount,
						endAmount: opportunity.endAmount,
						revenueInUsd: opportunity.revenueInUsd,
						costInUsd: opportunity.costInUsd,
						profitInUsd: opportunity.profitInUsd,
						path: opportunity.quotedStepSequence.map((p) => {
							return {
								edge: p.edge.id,
								quote: p.quote,
							}
						}),
					}
				})
			: null

		this.logger.log({ validationResult, opportunities: opportunitiesLog })
	}
}
