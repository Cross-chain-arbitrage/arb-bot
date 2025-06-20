import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'
import { WrappedNative } from '../primitives/tokens/WrappedNative'

declare global {
	type GraphNode = Token | NativeCurrency | WrappedNative

	enum ActionType {
		SWAP = 'SWAP',
		STARGATE_BRIDGE = 'STARGATE_BRIDGE',
		FUSE_BRIDGE = 'FUSE_BRIDGE',
		WRAP = 'WRAP',
		UNWRAP = 'UNWRAP',
	}

	type GetRateResult = {
		rate: number // negative log of exchange rate
		amountOut: bigint
	}

	type GraphNodeId = TokenId

	interface GraphArbitrageOpportunity {
		path: EdgeWithRate[]
		startAmount: bigint
		endAmount: bigint
		profitAmount: bigint
		profitPercentage: number
	}

	type EdgeId = `${GraphNodeId}-${GraphNodeId}-${string}`
}
