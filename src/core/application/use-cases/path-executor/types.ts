import { Path, Step } from '../../../domain/services/bellman-ford'
import { EdgeActionProvider } from '../../interfaces/edge-action-provider'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any
type Wrapper<F extends AnyFn> = (fn: F) => Promise<Awaited<ReturnType<F>>>

export interface PathExecutorParams {
	path: Path
	startAmount: bigint

	executeWrapper?: Wrapper<EdgeActionProvider['execute']>
	confirmWrapper?: Wrapper<EdgeActionProvider['confirm']>
	getExecutionCostWrapper?: Wrapper<EdgeActionProvider['getExecutionCost']>

	beforeExecuteEdgeHook?: (
		path: Path,
		currentStep: Step,
		amountIn: bigint,
	) => void
	afterExecuteEdgeHook?: (
		path: Path,
		currentStep: Step,
		amountIn: bigint,
	) => void

	beforeConfirmEdgeHook?: (path: Path, currentStep: Step) => void
	afterConfirmEdgeHook?: (
		path: Path,
		currentStep: Step,
		amountOut: bigint,
	) => void

	beforeGetExecutionCostHook?: (path: Path, currentStep: Step) => void
	afterGetExecutionCostHook?: (
		path: Path,
		currentStep: Step,
		costInUsd: number,
	) => void
}
