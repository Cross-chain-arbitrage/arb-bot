import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { ChannelIdUtils } from '../../../domain/services/channel-id-utils'
import { EdgeIdUtils } from '../../../domain/services/edge-id-utils'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { Token } from '../../evm/primitives/tokens/Token'
import {
	StargateAPIError,
	StargateAPIService,
} from '../../layerzero-bridges/stargate/stargate-api.service'
import { pathToGraphConfig } from '../shared/utils/path-to-config'
import { STARGATE_CONFIG_KEY, STARGATE_PROTOCOL } from './constants'
import { StargateGraphConfig } from './types'

@Injectable()
export class StargateGraphPlugin implements GraphPlugin {
	constructor(
		readonly configService: ConfigService,
		readonly stargateAPIService: StargateAPIService,
	) {}

	async findPossibleEdges(nodes: Node[]): Promise<Edge[]> {
		const { connectSecondaryChains, baseChainId } =
			this.configService.get<StargateGraphConfig>(
				pathToGraphConfig(STARGATE_CONFIG_KEY),
			) ?? {
				connectSecondaryChains: true,
				baseChainId: 0,
			}

		type AssetId = number

		const assetGroups: Map<AssetId, Set<Token | NativeCurrency>> = new Map()

		const filteredTokensArray = nodes.filter(
			(token) =>
				token instanceof NativeCurrency || token instanceof Token,
		)

		for (const token of filteredTokensArray) {
			let metadata: StargateTokenMetadata

			try {
				metadata = await this.stargateAPIService.getTokenMetadata(token)
			} catch (error) {
				if (
					error instanceof StargateAPIError &&
					error.message.includes('not found')
				) {
					continue
				} else {
					throw error
				}
			}

			const assetId = Number(metadata.assetId)

			if (!assetGroups.has(assetId)) {
				assetGroups.set(assetId, new Set())
			}

			assetGroups.get(assetId)?.add(token)
		}

		const pairs: [Token | NativeCurrency, Token | NativeCurrency][] = []

		for (const assets of assetGroups.values()) {
			const tokens = Array.from(assets)

			for (let i = 0; i < tokens.length; i++) {
				for (let j = 0; j < tokens.length; j++) {
					if (tokens[i].id === tokens[j].id) continue

					// Skip pair if there's no token on the base chain
					if (
						!connectSecondaryChains &&
						tokens[i].chainId !== baseChainId &&
						tokens[j].chainId !== baseChainId
					)
						continue

					pairs.push([tokens[i], tokens[j]])
				}
			}
		}

		const edges: Edge[] = []

		for (const pair of pairs) {
			const edge: Edge = {
				from: pair[0],
				to: pair[1],
				id: EdgeIdUtils.generateId(
					ChannelIdUtils.generateId(STARGATE_PROTOCOL, 'default'),
					pair[0].id,
					pair[1].id,
				),
			}

			edges.push(edge)
		}

		return edges
	}
}
