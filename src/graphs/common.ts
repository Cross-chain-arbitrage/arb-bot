import { TokenBase } from '../../primitives/tokens/TokenBase'

export class Action {
	constructor(public readonly actionType: ActionType) {}
}

export enum ActionType {
	Swap,
	Wrap,
	Unwrap,
	StargateBridge,
	FuseBridge,
}

export type Node = TokenBase
export type Edge = Action
