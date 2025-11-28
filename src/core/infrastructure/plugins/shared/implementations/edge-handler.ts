import { EdgeHandlerPlugin } from '../../../../application/interfaces/graph-plugin'
import { Edge } from '../../../../domain/entities/edge'
import { Node } from '../../../../domain/entities/node'
import { ChannelIdUtils } from '../../../../domain/services/channel-id-utils'
import { EdgeIdUtils } from '../../../../domain/services/edge-id-utils'

export class EdgeHandler implements EdgeHandlerPlugin {
	constructor(readonly protocol: string) {}

	canHandle(edge: Edge): boolean {
		const { channelId } = EdgeIdUtils.parseId(edge.id)
		const { protocol } = ChannelIdUtils.parseId(channelId)

		return protocol.toLowerCase() === this.protocol.toLowerCase()
	}

	createEdge(from: Node, to: Node): Edge {
		return {
			from,
			to,
			id: EdgeIdUtils.generateId(
				ChannelIdUtils.generateId(this.protocol, 'default'),
				from.id,
				to.id,
			),
		}
	}
}
