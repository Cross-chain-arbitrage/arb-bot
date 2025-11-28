import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import { GRAPH_TOKEN } from '../../graph-builder/graph-token'
import { OpportunityFinder } from '../opportunity-finder.ts/opportunity-finder'
import { ParamsFindOpportunity } from '../opportunity-finder.ts/types'
import { OpportunityValidator } from '../opportunity-validator/opportunity-validator'
import { OpportunityValidatorParams } from '../opportunity-validator/types'
import { ArbitrageFinderTelemetry } from './arbitrage-finder-telemetry'
import { ArbitrageFinderConfig } from './types'

export const ARBITRAGE_FINDER_CONFIG_KEY = 'arbitrageFinder'

@Injectable()
export class ArbitrageFinder {
	private paramsFindOpportunity!: ParamsFindOpportunity
	private opportunityValidatorParams!: OpportunityValidatorParams

	logger = new Logger(ArbitrageFinder.name)

	constructor(
		private readonly opportunityFinder: OpportunityFinder,
		private readonly opportunityValidator: OpportunityValidator,
		private readonly configService: ConfigService,
		@Inject(GRAPH_TOKEN) readonly graph: Graph<Token>,
		private readonly telemetry: ArbitrageFinderTelemetry,
	) {
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

		this.paramsFindOpportunity = {
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
			this.paramsFindOpportunity,
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
