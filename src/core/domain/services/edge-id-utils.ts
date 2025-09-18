import { ChannelId } from '../value-objects/channel-id'
import { EdgeId, edgeIdScheme } from '../value-objects/edge-id'

export class EdgeIdUtils {
	static parseId(edgeId: string): {
		channelId: ChannelId
		fromId: string
		toId: string
	} {
		const edgeIdChecked = edgeIdScheme.parse(edgeId)

		const [channel, from, to] = edgeIdChecked.split('::')

		return {
			channelId: channel as ChannelId,
			fromId: from,
			toId: to,
		}
	}

	static generateId(
		channelId: ChannelId,
		fromId: string,
		toId: string,
	): EdgeId {
		return `${channelId}::${fromId}::${toId}`
	}
}
