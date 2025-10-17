import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Graph } from '../../../../domain/entities/graph'
import { Token } from '../../../../domain/entities/token'
import { QuotedPath } from '../../../../domain/value-objects/path'
import {
	EDGE_EXECUTOR_REGISTRY_TOKEN,
	EdgeExecutorRegistry,
} from '../../../interfaces/edge-executor'
import {
	EDGE_QUOTER_REGISTRY_TOKEN,
	EdgeQuoterRegistry,
} from '../../../interfaces/edge-quoter'
import {
	PRICE_ORACLE_TOKEN,
	PriceOracle,
} from '../../../interfaces/price-oracle'
import { GraphArbitrageOpportunity } from '../../finding/snapshot-opportunity-finder/types'
import { GRAPH_TOKEN } from '../../graph-builder/graph-token'
import { TokenValuator } from '../../token-valuator/token-valuator'
import { PathExecutor } from '../path-executor/path-executor'
import {
	PathExecutorParams,
	SuccessPathExecutionResult,
} from '../path-executor/types'
import { PathRecovery } from '../path-recovery/path-recovery'
import { ArbitrageExecutionTelemetry } from './arbitrage-execution-telemetry'
import { getStartStepIndex } from './helpers'
import {
	ArbitrageExecutorConfig,
	ArbitrageResult,
	FailedArbitrageResult,
	SuccessArbitrageResult,
} from './types'

export const ARBITRAGE_EXECUTOR_CONFIG_KEY = 'arbitrageExecutor'

@Injectable()
export class ArbitrageExecutor {
	private readonly config: ArbitrageExecutorConfig

	constructor(
		private readonly pathExecutor: PathExecutor,
		private readonly pathRecovery: PathRecovery,
		private readonly telemetry: ArbitrageExecutionTelemetry,
		private readonly configService: ConfigService,
		private readonly tokenValuator: TokenValuator,

		@Inject(EDGE_QUOTER_REGISTRY_TOKEN)
		private readonly quoterRegistry: EdgeQuoterRegistry,

		@Inject(EDGE_EXECUTOR_REGISTRY_TOKEN)
		private readonly edgeExecutorRegistry: EdgeExecutorRegistry,

		@Inject(PRICE_ORACLE_TOKEN)
		private readonly priceOracle: PriceOracle,

		@Inject(GRAPH_TOKEN)
		private readonly graph: Graph<Token>,
	) {
		const config = this.configService.get<ArbitrageExecutorConfig>(
			ARBITRAGE_EXECUTOR_CONFIG_KEY,
		)

		if (!config) throw new Error('Arbitrage executor config not found')

		this.validateConfig(config)

		this.config = config
	}

	async execute(
		opportunity: GraphArbitrageOpportunity,
	): Promise<ArbitrageResult> {
		const opportunityToExecute =
			await this.getOpportunityToExecute(opportunity)

		this.telemetry.onArbitrageStart(opportunityToExecute)

		const startTimestamp = Date.now()

		const pathExecutorParams: PathExecutorParams = {
			path: {
				stepSequence: opportunityToExecute.quotedStepSequence.map(
					(step) => ({ edge: step.edge }),
				),
				startAmount: opportunityToExecute.startAmount,
			},
		}

		const pathResult = await this.pathExecutor.executePath(
			pathExecutorParams,
			(params, stepIndex, amountIn) =>
				this.validateStep(
					opportunityToExecute.quotedStepSequence,
					params,
					stepIndex,
					amountIn,
				),
		)

		const executionTime = Date.now() - startTimestamp

		if (pathResult.status === 'failed') {
			const recoveryResult = await this.pathRecovery.attemptRecovery({
				failedStepIndex: pathResult.stepIndex,
				originalPath: opportunityToExecute,
				minTokenThresholds: new Map(),
			})
			const arbitrageResult: FailedArbitrageResult = {
				status: 'failed',
				pathExecutionResult: pathResult,
				recoveryResult,
				executionTime,
			}

			this.telemetry.onArbitrageEnd(opportunityToExecute, arbitrageResult)

			return arbitrageResult
		}

		const arbitrageResult = await this.buildSuccessResult(
			opportunityToExecute,
			pathResult,
			startTimestamp,
		)

		this.telemetry.onArbitrageEnd(opportunityToExecute, arbitrageResult)

		return arbitrageResult
	}

	private async getOpportunityToExecute(
		opportunity: GraphArbitrageOpportunity,
	): Promise<GraphArbitrageOpportunity> {
		const startRules = this.config.startRules

		if (!startRules) return opportunity

		const startStepIndex = getStartStepIndex(
			opportunity.quotedStepSequence,
			startRules,
		)

		if (startStepIndex === undefined)
			throw new Error("Couldn't obtain startStepIndex from startRules")

		const newQuotedStepSequence = [
			...opportunity.quotedStepSequence.slice(
				startStepIndex,
				opportunity.quotedStepSequence.length,
			),
			...opportunity.quotedStepSequence.slice(0, startStepIndex),
		]

		const startToken = opportunity.quotedStepSequence[0].edge.from

		const newStartToken = newQuotedStepSequence[0].edge.from

		const newStartAmount = await this.tokenValuator.convertTokenAmount(
			startToken,
			newStartToken,
			opportunity.startAmount,
		)

		const newEndAmount = await this.tokenValuator.convertTokenAmount(
			startToken,
			newStartToken,
			opportunity.endAmount,
		)

		const newOpportunity: GraphArbitrageOpportunity = {
			costInUsd: opportunity.costInUsd,
			endAmount: newEndAmount,
			startAmount: newStartAmount,
			id: opportunity.id,
			quotedStepSequence: newQuotedStepSequence,
			revenueInUsd: opportunity.revenueInUsd,
			profitInUsd: opportunity.profitInUsd,
		}

		return newOpportunity
	}

	private async buildSuccessResult(
		opportunity: GraphArbitrageOpportunity,
		pathExecutionResult: SuccessPathExecutionResult,
		startTimestamp: number,
	): Promise<SuccessArbitrageResult> {
		const executionTime = Date.now() - startTimestamp

		const { actualEndAmount, totalExecutionCostInUsd } = pathExecutionResult

		const startToken = opportunity.quotedStepSequence[0].edge.from

		const startTokenPrice = await this.priceOracle.getPrice(startToken)
		const actualRevenue =
			Number(
				startToken.formatUnits(
					actualEndAmount - opportunity.startAmount,
				),
			) * startTokenPrice
		const actualProfit = actualRevenue - totalExecutionCostInUsd

		return {
			pathExecutionResult: pathExecutionResult,
			status: 'success',
			executionTime,
			profitInUsd: actualProfit,
			revenueInUsd: actualRevenue,
		}
	}

	private async validateStep(
		quotedStepSequence: QuotedPath['quotedStepSequence'],
		params: PathExecutorParams,
		stepIndex: number,
		amountIn: bigint,
	): Promise<{ isValid: true } | { isValid: false; reason: string }> {
		const step = params.path.stepSequence[stepIndex].edge
		const edgeExecutor = this.edgeExecutorRegistry.get(step.id)

		if (!edgeExecutor)
			throw new Error(`Edge executor not found for edge ${step.id}`)

		if (edgeExecutor.kind === 'crosschain') return { isValid: true }

		const quoter = this.quoterRegistry.get(step.id)

		if (!quoter) throw new Error(`Quoter not found for edge ${step.id}`)

		const quote = await quoter.quote(amountIn)

		const rateSum = quotedStepSequence.reduce((acc, stepInPath) => {
			if (stepInPath.edge.id === step.id)
				return acc + quote.negativeLogRate

			return acc + stepInPath.quote.negativeLogRate
		}, 0)

		if (rateSum > 0)
			return {
				isValid: false,
				reason: `Rate sum became positive (${rateSum.toFixed(2)}), arbitrage is no longer possible`,
			}

		return { isValid: true }
	}

	validateConfig(config: ArbitrageExecutorConfig): void {
		if (config.startRules) {
			for (const startRule of config.startRules) {
				const startToken = this.graph.getNode(startRule.startTokenId)
				const directionToken = this.graph.getNode(
					startRule.directionTokenId,
				)

				if (!startToken)
					throw new Error(
						`Start token not found for start rule ${startRule.startTokenId}`,
					)

				if (!directionToken)
					throw new Error(
						`Direction token not found for start rule ${startRule.directionTokenId}`,
					)
			}
		}

		if (config.pathRecoveryConfig.enabled) {
			const iterableThresholds =
				config.pathRecoveryConfig.minTokenThresholds || []

			for (const { tokenId, threshold } of iterableThresholds) {
				const token = this.graph.getNode(tokenId)

				if (!token)
					throw new Error(
						`Token not found for min token threshold ${tokenId}`,
					)
			}
		}
	}
}
