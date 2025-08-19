import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { SolanaToken } from '../../solana/solana-tokens/solana-token'
import { SolanaTokenUtils } from '../../solana/solana-tokens/solana-token-utils'

export async function getNode(
	this: {
		solanaTokenUtils: SolanaTokenUtils
		tokenUtils: TokenUtils
	},
	nodeConfig: { chainId: number | 'solana'; address: string },
) {
	if (nodeConfig.chainId === 'solana') {
		return this.solanaTokenUtils.fromAddress<SolanaToken>(
			nodeConfig.address,
		)
	}

	return this.tokenUtils.fromAddress(
		nodeConfig.address as `0x${string}`,
		nodeConfig.chainId,
	)
}

export type ConfigForDeterminedNodesAndEdges = {
	edges: {
		from: {
			chainId: number | 'solana'
			address: string
		}
		to: {
			chainId: number | 'solana'
			address: string
		}
	}[]
}

export async function getNodesAndEdgesFromConfig(
	this: {
		solanaTokenUtils: SolanaTokenUtils
		tokenUtils: TokenUtils
		name: string
	},
	config: ConfigForDeterminedNodesAndEdges,
) {
	const nodes: Node[] = []
	const edges: Edge[] = []

	for (const edgeConstructor of config.edges) {
		const from = await getNode.bind(this)(edgeConstructor.from)
		const to = await getNode.bind(this)(edgeConstructor.to)

		nodes.push(from, to)

		const edge = {
			from,
			to,
			id: `${from.id}-${to.id}-${this.name}`,
		}

		edges.push(edge)
	}

	return {
		nodes,
		edges,
	}
}
