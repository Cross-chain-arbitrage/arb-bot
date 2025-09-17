import { Injectable } from '@nestjs/common'
import { fuse } from 'viem/chains'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { ChannelIdUtils } from '../../../domain/services/channel-id-utils'
import { EdgeIdUtils } from '../../../domain/services/edge-id-utils'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import { FUSE_BRIDGE_SUPPORTED_TOKENS } from '../../layerzero-bridges/fuse-bridge/fuse-bridge.constants'
import { FUSE_BRIDGE_PROTOCOL } from './constants'

@Injectable()
export class FuseBridgeGraphPlugin implements GraphPlugin {
	constructor() {}

	findPossibleEdges(nodes: Node[]): Promise<Edge[]> {
		type AssetId = string

		const assetGroups: Map<AssetId, Set<Token | NativeCurrency>> = new Map()
		const filteredTokensArray = nodes.filter(
			(token) =>
				token instanceof NativeCurrency || token instanceof Token,
		)

		for (const node of filteredTokensArray) {
			const supportedTokens = FUSE_BRIDGE_SUPPORTED_TOKENS.map(
				(token) => `${token.chainId}:${token.address.toLowerCase()}`,
			)

			if (supportedTokens.includes(node.id)) {
				const assetId = node.symbol

				if (!assetGroups.has(assetId)) {
					assetGroups.set(assetId, new Set())
				}

				assetGroups.get(assetId)?.add(node)
			}
		}

		// Handle FUSE tokens specially
		const fuseAssets = assetGroups.get('FUSE')
		const wfuseAssets = assetGroups.get('WFUSE')

		const edges: Edge[] = []

		if (fuseAssets && wfuseAssets) {
			const wfuseToken = Array.from(wfuseAssets)[0] // Only one WFUSE token
			const fuseOnOtherChains = Array.from(fuseAssets).filter(
				(token) => token.chainId !== fuse.id,
			)
			const nativeFuseOnFuse = Array.from(fuseAssets).find(
				(token) => token.chainId === fuse.id,
			)

			// FUSE from other chains → WFUSE on Fuse
			for (const fuseToken of fuseOnOtherChains) {
				const edge: Edge = this.createEdge(fuseToken, wfuseToken)

				edges.push(edge)
			}

			// Native FUSE on Fuse → FUSE on other chains
			if (nativeFuseOnFuse) {
				for (const fuseToken of fuseOnOtherChains) {
					const edge: Edge = this.createEdge(
						nativeFuseOnFuse,
						fuseToken,
					)

					edges.push(edge)
				}
			}

			// Remove FUSE and WFUSE from regular processing
			assetGroups.delete('FUSE')
			assetGroups.delete('WFUSE')
		}

		// Handle other tokens with original logic
		for (const assets of assetGroups.values()) {
			const tokens = Array.from(assets)

			const tokenOnFuse = tokens.find(
				(token) => token.chainId === fuse.id,
			)

			if (!tokenOnFuse) {
				continue
			}

			for (const token of tokens) {
				if (token.chainId === fuse.id) continue

				const edgeToFuse = this.createEdge(token, tokenOnFuse)
				edges.push(edgeToFuse)

				const edgeFromFuse = this.createEdge(tokenOnFuse, token)
				edges.push(edgeFromFuse)
			}
		}

		return Promise.resolve(edges)
	}

	createEdge(from: Node, to: Node): Edge {
		const edge: Edge = {
			from: from,
			to: to,
			id: EdgeIdUtils.generateId(
				ChannelIdUtils.generateId(FUSE_BRIDGE_PROTOCOL, 'default'),
				from.id,
				to.id,
			),
		}

		return edge
	}
}
