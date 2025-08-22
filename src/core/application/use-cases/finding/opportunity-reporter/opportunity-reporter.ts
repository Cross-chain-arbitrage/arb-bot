import { Injectable, Logger } from '@nestjs/common'
import { ValidationResult } from '../opportunity-validator/types'
import { GraphArbitrageOpportunity } from '../snapshot-opportunity-finder/types'

@Injectable()
export class OpportunityReporter {
	private readonly logger: Logger = new Logger(OpportunityReporter.name)

	constructor() {}

	reportOpportunity(
		opportunity: GraphArbitrageOpportunity | null,
		validationResult: ValidationResult,
	) {
		this.logger.log(validationResult)

		if (opportunity) {
			this.logger.log({
				startAmount: opportunity.startAmount,
				endAmount: opportunity.endAmount,
				path: opportunity.path.map((p) => {
					return {
						edge: p.edge.id,
						quote: p.quote,
					}
				}),
			})
		}
	}
}
