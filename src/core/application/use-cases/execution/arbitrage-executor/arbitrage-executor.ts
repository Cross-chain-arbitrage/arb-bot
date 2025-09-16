import { Inject, Injectable } from '@nestjs/common'
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
import { PathExecutor } from '../path-executor/path-executor'
import {
	PathExecutionResult,
	PathExecutorParams,
	ValidateStep,
} from '../path-executor/types'
import { ArbitrageExecutionTelemetry } from './arbitrage-execution-telemetry'
import { ArbitrageResult } from './types'

@Injectable()
export class ArbitrageExecutor {
	constructor(
		private readonly pathExecutor: PathExecutor,
		private readonly telemetry: ArbitrageExecutionTelemetry,

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
		this.telemetry.onArbitrageStart(opportunity)

		const startTimestamp = Date.now()

		const pathExecutorParams: PathExecutorParams = {
			path: opportunity.path,
			startAmount: opportunity.startAmount,
		}

		const pathResult = await this.pathExecutor.executePath(
			pathExecutorParams,
			this.validateStep,
		)

		const arbitrageResult = await this.buildSuccessResult(
			opportunity,
			pathResult,
			startTimestamp,
		)

		this.telemetry.onArbitrageEnd(opportunity, arbitrageResult)

		return arbitrageResult
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

		const startTokenPrice = await this.priceOracle.getPrice(
			opportunity.startToken,
		)
		const actualRevenue =
			Number(
				opportunity.startToken.formatUnits(
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

	validateStep: ValidateStep = async (params, step, amountIn) => {
		const edgeExecutor = this.edgeExecutorRegistry.get(step.edge.id)

		if (!edgeExecutor)
			throw new Error(`Edge executor not found for edge ${step.edge.id}`)

		if (edgeExecutor.kind === 'crosschain') return { isValid: true }

		const quoter = this.quoterRegistry.get(step.edge.id)

		if (!quoter)
			throw new Error(`Quoter not found for edge ${step.edge.id}`)

		const quote = await quoter.quote(amountIn)

		const rateSum = params.path.reduce((acc, stepInPath) => {
			if (stepInPath.edge.id === step.edge.id) return acc + quote.rate

			return acc + stepInPath.quote.rate
		}, 0)

		if (rateSum > 0)
			return {
				isValid: false,
				reason: `Rate sum became positive (${rateSum.toFixed(2)}), arbitrage is no longer possible`,
			}

		return { isValid: true }
	}
}
