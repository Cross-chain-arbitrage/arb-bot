import { Hash, TransactionReceipt } from 'viem'
import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'
import { TokenAmount } from '../primitives/tokens/TokenAmount'
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

	type EdgeExecutionCost<T extends ActionType = ActionType> = {
		gas: bigint
	} & (T extends BridgeActionType
		? {
				bridgeFee: TokenAmount
			}
		: object)

	type EdgeQuoteResult<T extends ActionType = ActionType> = GetRateResult & {
		cost: EdgeExecutionCost<T>
	}

	type EdgeExecutionResult<T extends ActionType> = {
		amountOut: bigint
	} & (T extends BridgeActionType
		? {
				srcTxReceipt: TransactionReceipt
				bridgeFee: TokenAmount
				dstTxHash: Hash
			}
		: {
				txReceipt: TransactionReceipt
			})
}
