import { Confirmation, Execution } from '../../../interfaces/edge-executor'

export enum StepPhase {
	EXECUTE = 'execute',
	CONFIRM = 'confirm',
}

export type StepExecutionResult = {
	execution: Execution
	confirmation: Confirmation
}
