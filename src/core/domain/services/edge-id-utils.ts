import { EdgeId, edgeIdScheme } from '../value-objects/edge-id'

export class EdgeIdUtils {
	static parseId(edgeId: string): {
		channelId: string
		fromId: string
		toId: string
	} {
		const edgeIdChecked = edgeIdScheme.parse(edgeId)

		const [channel, from, to] = edgeIdChecked.split('::')

		return {
			channelId: channel,
			fromId: from,
			toId: to,
		}
	}

	static generateId(channelId: string, fromId: string, toId: string): EdgeId {
		return `${channelId}::${fromId}::${toId}`
	}
}
