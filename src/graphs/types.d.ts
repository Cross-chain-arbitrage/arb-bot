import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'
import { WrappedNative } from '../primitives/tokens/WrappedNative'
import { ActionType, Edge } from './primitives/Edge'

declare global {
	type GraphNode = Token | NativeCurrency | WrappedNative

	type GetRateResult = {
		rate: number // negative log of exchange rate
		amountOut: bigint
	}

	type GraphNodeId = TokenId

	interface GraphArbitrageOpportunity {
		path: Edge[]
		startAmount: bigint
		endAmount: bigint
		profitAmount: bigint
		profitPercentage: number
	}

	type EdgeId = `${GraphNodeId}-${GraphNodeId}-${string}`

	type InchainActionType =
		| ActionType.SWAP
		| ActionType.WRAP
		| ActionType.UNWRAP
	type BridgeActionType = ActionType.STARGATE_BRIDGE | ActionType.FUSE_BRIDGE
}
