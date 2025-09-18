import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphPlugin } from '../../../application/interfaces/graph-plugin'
import { Edge } from '../../../domain/entities/edge'
import { Node } from '../../../domain/entities/node'
import { ChannelIdUtils } from '../../../domain/services/channel-id-utils'
import { EdgeIdUtils } from '../../../domain/services/edge-id-utils'
import { NativeCurrency } from '../../evm/primitives/tokens/NativeCurrency'
import { TokenUtils } from '../../evm/primitives/tokens/TokenUtils'
import { WrappedNative } from '../../evm/primitives/tokens/WrappedNative'
import { NATIVE_WRAPPER_CONFIG_KEY } from './configuration/native-wrapper-config'
import { Direction, NATIVE_WRAPPER_PROTOCOL } from './constants'
import { NativeWrapperConfig } from './types'

@Injectable()
export class NativeWrapperGraphPlugin implements GraphPlugin {
	constructor(
		private readonly configService: ConfigService,
		private readonly tokenUtils: TokenUtils,
	) {}

	async findPossibleNodes(): Promise<Node[]> {
		const config = this.configService.get<NativeWrapperConfig>(
			NATIVE_WRAPPER_CONFIG_KEY,
		)

		if (!config) return []

		const nodes: Node[] = []

		for (const chainId of config.chainIds) {
			const nativeCurrency = this.tokenUtils.getNative(chainId)

			const wrappedNative =
				await this.tokenUtils.getWrappedNative(chainId)

			nodes.push(nativeCurrency, wrappedNative)
		}

		return nodes
	}

	async findPossibleEdges(nodes: Node[]): Promise<Edge[]> {
		const chainIdToNative = new Map<number, NativeCurrency>()
		const chainIdToWrappedNative = new Map<number, WrappedNative>()

		for (const node of nodes) {
			if (node instanceof NativeCurrency) {
				chainIdToNative.set(node.chainId, node)
			}
			if (node instanceof WrappedNative) {
				chainIdToWrappedNative.set(node.chainId, node)
			}
		}

		const edges: Edge[] = []

		for (const [chainId, nativeCurrency] of chainIdToNative) {
			const wrappedNative = chainIdToWrappedNative.get(chainId)

			if (!wrappedNative) continue

			const edgeWrap = {
				from: nativeCurrency,
				to: wrappedNative,
				id: EdgeIdUtils.generateId(
					ChannelIdUtils.generateId(
						NATIVE_WRAPPER_PROTOCOL,
						Direction.WRAP,
					),
					nativeCurrency.id,
					wrappedNative.id,
				),
			}

			const edgeUnwrap = {
				from: wrappedNative,
				to: nativeCurrency,
				id: EdgeIdUtils.generateId(
					ChannelIdUtils.generateId(
						NATIVE_WRAPPER_PROTOCOL,
						Direction.UNWRAP,
					),
					wrappedNative.id,
					nativeCurrency.id,
				),
			}

			edges.push(edgeWrap, edgeUnwrap)
		}

		return Promise.resolve(edges)
	}
}
