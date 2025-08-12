import { Injectable, Logger } from '@nestjs/common'
import { runFnWithRetry } from '../utils/common'
import { CrosschainEdge } from './primitives/edges/crosschain/crosschain-edge'
import { Edge } from './primitives/edges/edge'

export interface GraphExecutorConfig {
	path: Edge[]
	startAmount: bigint
	retryExecuteEdgeCount: number
	beforeExecuteEdgeHook?: (
		path: Edge[],
		currentEdge: Edge,
		amountIn: bigint,
	) => unknown
	afterExecuteEdgeHook?: (
		path: Edge[],
		currentEdge: Edge,
		amountOut: bigint,
	) => unknown
}

@Injectable()
export class GraphExecutor {
	constructor(readonly logger: Logger) {}

	/**
	 * Execute the arbitrage path
	 * @returns actual end amount
	 */
	async execute(config: GraphExecutorConfig) {
		const {
			path,
			startAmount,
			retryExecuteEdgeCount,
			beforeExecuteEdgeHook,
			afterExecuteEdgeHook,
		} = config

		let nextAmountIn = startAmount
		let totalTxsCostInUsd = 0

		for (const edge of path) {
			const { from, to } = edge

			await beforeExecuteEdgeHook?.(path, edge, nextAmountIn)

			const beforeExecuteLogMsg = `Start ${edge.constructor.name} from: ${from.toString()} to:${to.toString()} input:${from.formatUnits(nextAmountIn)}}`
			this.logger.log(beforeExecuteLogMsg)

			const executionResult = await runFnWithRetry(
				() => edge.execute(nextAmountIn),
				retryExecuteEdgeCount,
				this.logger,
			)

			const executionCostInUsd = this.handleExecutionResult(
				edge,
				executionResult,
			)

			totalTxsCostInUsd += executionCostInUsd

			await afterExecuteEdgeHook?.(path, edge, executionResult.amountOut)

			nextAmountIn = executionResult.amountOut
		}

		return {
			actualEndAmount: nextAmountIn,
			totalTxsCostInUsd,
		}
	}

	/**
	 * build and print log and calculate tx cost
	 */
	handleExecutionResult(
		edge: Edge,
		executionResult:
			| InchainEdgeExecutionResult
			| CrosschainEdgeExecutionResult,
	) {
		let executionResultLogMsg = `\n┌─ ${edge.constructor.name} COMPLETED ─────────────────────\n`
		executionResultLogMsg += `│ Output Amount: ${edge.to.formatUnits(executionResult.amountOut)} ${edge.to.symbol}\n`

		if (edge instanceof CrosschainEdge) {
			const { srcTxHash, dstTxHash, costInUsd } =
				executionResult as CrosschainEdgeExecutionResult

			executionResultLogMsg += `│ Source Tx:     ${srcTxHash}\n`
			executionResultLogMsg += `│ Destination Tx: ${dstTxHash}\n`
		} else {
			const { txHash } = executionResult as InchainEdgeExecutionResult

			executionResultLogMsg += `│ Transaction:   ${txHash}\n`
		}

		executionResultLogMsg += `│ Actual Cost:    $${executionResult.costInUsd.toFixed(2)}\n`
		executionResultLogMsg += `└────────────────────────────────────────────────────\n`

		this.logger.log(executionResultLogMsg)

		return executionResult.costInUsd
	}
}
