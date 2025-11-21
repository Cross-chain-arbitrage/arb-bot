import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import { GRAPH_TOKEN } from '../../graph-builder/graph-token'
import { OpportunityFinder } from '../opportunity-finder.ts/opportunity-finder'
import { OpportunityValidator } from '../opportunity-validator/opportunity-validator'
import { OpportunityValidatorParams } from '../opportunity-validator/types'
import { SnapshotFindOpportunityParams } from '../snapshot-opportunity-finder/types'
import { ArbitrageFinderTelemetry } from './arbitrage-finder-telemetry'
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
		private readonly telemetry: ArbitrageFinderTelemetry,
	) {}

	onModuleInit() {
		const config = this.configService.get<ArbitrageFinderConfig>(
			ARBITRAGE_FINDER_CONFIG_KEY,
		)

		if (!config) {
			throw new Error('Arbitrage finder config not found')
		}

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
		const opportunities = await this.opportunityFinder.findOpportunity(
			this.graph,
			this.snapshotFindOpportunityParams,
		)

		const validationResult =
			this.opportunityValidator.validateOpportunities(
				opportunities,
				this.opportunityValidatorParams,
			)

		this.telemetry.reportOpportunities(opportunities, validationResult)

		if (!validationResult.ok) return null

		return validationResult.opportunity
	}
}
