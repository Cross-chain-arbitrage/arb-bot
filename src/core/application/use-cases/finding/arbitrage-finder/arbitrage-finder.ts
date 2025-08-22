import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import { OpportunityFinder } from '../opportunity-finder.ts/opportunity-finder'
import { OpportunityValidator } from '../opportunity-validator/opportunity-validator'
import {
	OpportunityValidatorParams,
	ValidationResult,
} from '../opportunity-validator/types'
import {
	GraphArbitrageOpportunity,
	SnapshotFindOpportunityParams,
} from '../snapshot-opportunity-finder/types'
import { ArbitrageFinderConfig } from './types'

export const GRAPH_TOKEN = Symbol('GRAPH_TOKEN')

@Injectable()
export class ArbitrageFinder implements OnModuleInit {
	private snapshotFindOpportunityParams!: SnapshotFindOpportunityParams
	private opportunityValidatorParams!: OpportunityValidatorParams

	constructor(
		private readonly opportunityFinder: OpportunityFinder,
		private readonly opportunityValidator: OpportunityValidator,
		private readonly configService: ConfigService,
		@Inject(GRAPH_TOKEN) readonly graph: Graph<Token>,
	) {}

	onModuleInit() {
		const config =
			this.configService.get<ArbitrageFinderConfig>('arbitrageFinder')

		if (!config) {
			throw new Error('Arbitrage finder config not found')
		}

		const startToken = this.graph.nodes.get(config.finding.startTokenId)

		if (!startToken) {
			throw new Error('Start token not found')
		}

		this.snapshotFindOpportunityParams = {
			minStartValueUsd: config.finding.minStartValueUsd,
			maxStartValueUsd: config.finding.maxStartValueUsd,
			runCount: config.finding.runCount,
			startToken,
		}

		this.opportunityValidatorParams = config.validation
	}

	async findArbitrage() {
		const opportunity = await this.opportunityFinder.findOpportunity(
			this.graph,
			this.snapshotFindOpportunityParams,
		)

		const validationResult =
			await this.opportunityValidator.validateOpportunity(
				opportunity,
				this.opportunityValidatorParams,
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
