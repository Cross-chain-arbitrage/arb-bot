import { Path } from '../../../domain/services/bellman-ford'

export interface PathExecutorParams {
	path: Path
	startAmount: bigint
}
