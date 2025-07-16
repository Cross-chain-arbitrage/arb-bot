// SPDX-License-Identifier: MIT

export type OpportunityLogType =
	| 'success-finding'
	| 'success-execution'
	| 'skipped'
	| 'info'
	| 'error-finding'
	| 'error-executing'

export interface BaseOpportunityLog {
	type: OpportunityLogType
	module: string
	opportunityId?: string
	[key: string]: unknown // for extensibility
}

export interface AmountInfoOpportunityLog extends BaseOpportunityLog {
	profitAmount: string
	profitAmountUsd: number
	readableProfitAmount: number
	amountIn: string
	amountOut: string
}

export interface SuccessOpportunityLog extends AmountInfoOpportunityLog {
	type: 'success-finding'
	path: string[]
}

export interface SuccessExecutionOpportunityLog
	extends AmountInfoOpportunityLog {
	type: 'success-execution'
	executionTime: number
}

export interface ErrorFindingOpportunityLog extends BaseOpportunityLog {
	type: 'error-finding'
	error: string
	stack?: string
}

export interface ErrorExecutingOpportunityLog extends BaseOpportunityLog {
	type: 'error-executing'
	error: string
	stack?: string
}

export interface SkippedOpportunityLog extends AmountInfoOpportunityLog {
	type: 'skipped'
	reason: string
}

export type OpportunityLog =
	| SuccessOpportunityLog
	| ErrorFindingOpportunityLog
	| ErrorExecutingOpportunityLog
	| SkippedOpportunityLog
	| BaseOpportunityLog
