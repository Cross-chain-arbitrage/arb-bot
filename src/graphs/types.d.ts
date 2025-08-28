// import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
// import { Token } from '../primitives/tokens/Token'
// import { WrappedNative } from '../primitives/tokens/WrappedNative'
// import { SolanaToken } from '../solana/solana-tokens/solana-token'
// import { Edge } from './primitives/edges/edge'

// declare global {
// 	type GraphNode = Token | NativeCurrency | WrappedNative | SolanaToken

// 	type GetRateResult = {
// 		rate: number // negative log of exchange rate
// 		amountOut: bigint
// 	}

// 	type GraphNodeId = string

// 	interface GraphArbitrageOpportunity {
// 		path: Edge[]
// 		startAmount: bigint
// 		endAmount: bigint
// 		profitAmount: bigint
// 		profitPercentage: number
// 	}

// 	type EdgeId = string

// 	type EdgeQuoteResult = GetRateResult & {
// 		costInUsd: number
// 	}

// 	type CrosschainEdgeExecutionResult = {
// 		amountOut: bigint
// 		srcTxHash: string
// 		dstTxHash: string
// 		costInUsd: number
// 	}

// 	type InchainEdgeExecutionResult = {
// 		amountOut: bigint
// 		txHash: string
// 		costInUsd: number
// 	}
// }
