import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Graph } from '../../../../domain/entities/graph'
import { OpportunityFinder } from '../opportunity-finder.ts/opportunity-finder'
import { OpportunityValidator } from '../opportunity-validator/opportunity-validator'
import { ValidationResult } from '../opportunity-validator/types'
import { GraphArbitrageOpportunity } from '../snapshot-opportunity-finder/types'

export const GRAPH_TOKEN = Symbol('GRAPH_TOKEN')

@Injectable()
export class ArbitrageFinder {
	constructor(
		private readonly opportunityFinder: OpportunityFinder,
		private readonly opportunityValidator: OpportunityValidator,
		private readonly configService: ConfigService,
		@Inject(GRAPH_TOKEN) private readonly graph: Graph,
	) {}

	async findArbitrage() {
		const findOpportunityParams = this.configService.get(
			'findOpportunityParams',
		)

		const opportunity = await this.opportunityFinder.findOpportunity(
			this.graph,
			findOpportunityParams,
		)

		const validateOpportunityParams = this.configService.get(
			'validateOpportunityParams',
		)

		const validationResult =
			await this.opportunityValidator.validateOpportunity(
				opportunity,
				validateOpportunityParams,
			)

		if (this.isValidOpportunity(validationResult, opportunity))
			return opportunity

		return null
	}

	//TODO: add logging

	isValidOpportunity(
		validationResult: ValidationResult,
		opportunity: GraphArbitrageOpportunity | null,
	): opportunity is GraphArbitrageOpportunity {
		if (!opportunity) return false

		return validationResult.ok
	}
}
