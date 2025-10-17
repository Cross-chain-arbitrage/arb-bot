import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { QuotedPath } from '../../../../domain/value-objects/arbitrage-cycle'
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
import { TokenValuator } from '../../token-valuator/token-valuator'
import { PathExecutor } from '../path-executor/path-executor'
import { PathExecutionResult, PathExecutorParams } from '../path-executor/types'
import { ArbitrageExecutionTelemetry } from './arbitrage-execution-telemetry'
import { getStartStepIndex } from './helpers'
import { ArbitrageExecutorConfig, ArbitrageResult } from './types'

export const ARBITRAGE_EXECUTOR_CONFIG_KEY = 'arbitrageExecutor'

@Injectable()
export class ArbitrageExecutor {
	constructor(
		private readonly pathExecutor: PathExecutor,
		private readonly telemetry: ArbitrageExecutionTelemetry,
		private readonly configService: ConfigService,
		private readonly tokenValuator: TokenValuator,

		@Inject(EDGE_QUOTER_REGISTRY_TOKEN)
		private readonly quoterRegistry: EdgeQuoterRegistry,

		@Inject(EDGE_EXECUTOR_REGISTRY_TOKEN)
		private readonly edgeExecutorRegistry: EdgeExecutorRegistry,

		@Inject(PRICE_ORACLE_TOKEN)
		private readonly priceOracle: PriceOracle,
	) {}

	async execute(
		opportunity: GraphArbitrageOpportunity,
	): Promise<ArbitrageResult> {
		const opportunityToExecute =
			await this.getOpportunityToExecute(opportunity)

		this.telemetry.onArbitrageStart(opportunityToExecute)

		const startTimestamp = Date.now()

		const pathExecutorParams: PathExecutorParams = {
			path: opportunityToExecute.quotedPath.map((step) => step.edge),
			startAmount: opportunityToExecute.startAmount,
		}

		const pathResult = await this.pathExecutor.executePath(
			pathExecutorParams,
			(params, stepIndex, amountIn) =>
				this.validateStep(
					opportunityToExecute.quotedPath,
					params,
					stepIndex,
					amountIn,
				),
		)

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
		const config = this.configService.get<ArbitrageExecutorConfig>(
			ARBITRAGE_EXECUTOR_CONFIG_KEY,
		)

		const startRules = config?.startRules

		if (!startRules) return opportunity

		const startStepIndex = getStartStepIndex(
			opportunity.quotedPath,
			startRules,
		)

		if (startStepIndex === undefined)
			throw new Error("Couldn't obtain startStepIndex from startRules")

		const newPath = [
			...opportunity.quotedPath.slice(
				startStepIndex,
				opportunity.quotedPath.length,
			),
			...opportunity.quotedPath.slice(0, startStepIndex),
		]

		const startToken = opportunity.quotedPath[0].edge.from

		const newStartToken = newPath[0].edge.from

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
			quotedPath: newPath,
			revenueInUsd: opportunity.revenueInUsd,
			profitInUsd: opportunity.profitInUsd,
		}

		return newOpportunity
	}

	private async buildSuccessResult(
		opportunity: GraphArbitrageOpportunity,
		pathResult: PathExecutionResult,
		startTimestamp: number,
	): Promise<ArbitrageResult> {
		const executionTime = Date.now() - startTimestamp

		if (pathResult.status === 'failed')
			return {
				...pathResult,
				executionTime,
			}

		const { actualEndAmount, totalExecutionCostInUsd } = pathResult

		const startToken = opportunity.quotedPath[0].edge.from

		const startTokenPrice = await this.priceOracle.getPrice(startToken)
		const actualRevenue =
			Number(
				startToken.formatUnits(
					actualEndAmount - opportunity.startAmount,
				),
			) * startTokenPrice
		const actualProfit = actualRevenue - totalExecutionCostInUsd

		return {
			...pathResult,
			executionTime,
			profitInUsd: actualProfit,
			revenueInUsd: actualRevenue,
		}
	}

	private async validateStep(
		quotedPath: QuotedPath,
		params: PathExecutorParams,
		stepIndex: number,
		amountIn: bigint,
	): Promise<{ isValid: true } | { isValid: false; reason: string }> {
		const step = params.path[stepIndex]
		const edgeExecutor = this.edgeExecutorRegistry.get(step.id)

		if (!edgeExecutor)
			throw new Error(`Edge executor not found for edge ${step.id}`)

		if (edgeExecutor.kind === 'crosschain') return { isValid: true }

		const quoter = this.quoterRegistry.get(step.id)

		if (!quoter) throw new Error(`Quoter not found for edge ${step.id}`)

		const quote = await quoter.quote(amountIn)

		const rateSum = quotedPath.reduce((acc, stepInPath) => {
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
}
