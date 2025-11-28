import { Edge } from '../../../../domain/entities/edge'
import { Node } from '../../../../domain/entities/node'
import { ChannelIdUtils } from '../../../../domain/services/channel-id-utils'
import { EdgeIdUtils } from '../../../../domain/services/edge-id-utils'

type EdgeConstructor<EdgeConstructorNode> = {
	from: EdgeConstructorNode
	to: EdgeConstructorNode
}

export abstract class GraphBuildingHelper<EdgeConstructorNode> {
	createEdge(from: Node, to: Node, protocol: string): Edge {
		return {
			from,
			to,
			id: EdgeIdUtils.generateId(
				ChannelIdUtils.generateId(protocol, 'default'),
				from.id,
				to.id,
			),
		}
	}

	async getNodesAndEdgesFromConfig(
		edgeConstructors: EdgeConstructor<EdgeConstructorNode>[] | undefined,
		protocol: string,
	) {
		const nodes: Node[] = []
		const edges: Edge[] = []

		if (!edgeConstructors) {
			return {
				nodes,
				edges,
			}
		}

		for (const edgeConstructor of edgeConstructors) {
			const from = await this.getNode(edgeConstructor.from)
			const to = await this.getNode(edgeConstructor.to)

			nodes.push(from, to)

			const edge = this.createEdge(from, to, protocol)

			edges.push(edge)
		}

		return {
			nodes,
			edges,
		}
	}

	abstract getNode(edgeConstructorNode: EdgeConstructorNode): Promise<Node>
}
