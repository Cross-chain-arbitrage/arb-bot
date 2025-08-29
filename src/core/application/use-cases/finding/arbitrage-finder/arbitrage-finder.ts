import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import { GRAPH_TOKEN } from '../../graph-builder/graph-token'
import { OpportunityFinder } from '../opportunity-finder.ts/opportunity-finder'
import { OpportunityReporter } from '../opportunity-reporter/opportunity-reporter'
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

export const ARBITRAGE_FINDER_CONFIG_KEY = 'arbitrageFinder'

@Injectable()
export class ArbitrageFinder implements OnModuleInit {
	private snapshotFindOpportunityParams!: SnapshotFindOpportunityParams
	private opportunityValidatorParams!: OpportunityValidatorParams
	logger = new Logger(ArbitrageFinder.name)
	constructor(
		private readonly opportunityFinder: OpportunityFinder,
		private readonly opportunityValidator: OpportunityValidator,
		private readonly configService: ConfigService,
		@Inject(GRAPH_TOKEN) readonly graph: Graph<Token>,
		private readonly opportunityReporter: OpportunityReporter,
	) {}

	onModuleInit() {
		const config = this.configService.get<ArbitrageFinderConfig>(
			ARBITRAGE_FINDER_CONFIG_KEY,
		)

		if (!config) {
			throw new Error('Arbitrage finder config not found')
		}

		// TODO: Figure out how to do it properly
		const startToken = Array.from(this.graph.nodes.values()).find(
			(node) =>
				node.id.toLowerCase() ===
				config.opportunityFinding.startTokenId.toLowerCase(),
		)

		if (!startToken) {
			throw new Error('Start token not found')
		}

		this.snapshotFindOpportunityParams = {
			minStartValueUsd: config.opportunityFinding.minStartValueUsd,
			maxStartValueUsd: config.opportunityFinding.maxStartValueUsd,
			runCount: config.opportunityFinding.runCount,
			startToken,
		}

		this.opportunityValidatorParams = config.opportunityValidation
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

		this.opportunityReporter.reportOpportunity(
			opportunity,
			validationResult,
		)

		if (this.isValidOpportunity(validationResult, opportunity))
			return opportunity

		return null
	}

	isValidOpportunity(
		validationResult: ValidationResult,
		opportunity: GraphArbitrageOpportunity | null,
	): opportunity is GraphArbitrageOpportunity {
		if (!opportunity) return false

		return validationResult.ok
	}
}
