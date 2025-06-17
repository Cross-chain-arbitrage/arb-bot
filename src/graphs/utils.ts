import { NativeCurrency } from '../primitives/tokens/NativeCurrency'
import { Token } from '../primitives/tokens/Token'
import { TokenUtils } from '../primitives/tokens/TokenUtils'
import { WrappedNative } from '../primitives/tokens/WrappedNative'
import { GraphEdge } from './Graph'

// TODO: move this logic to Edge or Graph
/**
 * Workaround to having to pass Graph around to get the nodes of an edge
 * @param edge - The edge to get the nodes of
 * @returns The nodes of the edge
 * @dev This is a workaround applies logical overhead cos of Promise usage,
 * when it's definitely possible to get nodes synchronously
 */
export async function getEdgeNodes(edge: GraphEdge): Promise<{
	from: Token | WrappedNative | NativeCurrency
	to: Token | WrappedNative | NativeCurrency
}> {
	const { from, to } = edge

	const fromToken = await TokenUtils.fromId(from)
	const toToken = await TokenUtils.fromId(to)

	return {
		from: fromToken,
		to: toToken,
	}
}
